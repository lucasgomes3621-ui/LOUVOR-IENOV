-- ======================================================================================
-- LOUVOR+ — SISTEMA DE ACESSO MASTER DO LÍDER & POLÍTICAS RLS SUPABASE
-- Migração: 20260923_master_admin_auth.sql
-- ======================================================================================

-- 1. Atualizar ou adicionar colunas para username e controle de primeiro acesso
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS password_hash text;

-- Criar índice para busca ultra-rápida por nome de usuário (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (lower(username));

-- 2. Atualizar enum ou restrição de papel (UserRole)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_v2') THEN
        CREATE TYPE user_role_v2 AS ENUM ('MASTER_ADMIN', 'ADMIN', 'MINISTER', 'MEMBER');
    END IF;
END$$;

-- 3. Função de segurança para verificar se o usuário é MASTER_ADMIN
CREATE OR REPLACE FUNCTION is_master_admin(check_user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM ministry_members mm
        WHERE mm.user_id = check_user_id
          AND mm.role IN ('MASTER_ADMIN', 'admin')
          AND mm.active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função de segurança para verificar se o usuário pertence ao ministério
CREATE OR REPLACE FUNCTION is_ministry_member(check_user_id uuid, check_ministry_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM ministry_members mm
        WHERE mm.user_id = check_user_id
          AND mm.ministry_id = check_ministry_id
          AND mm.active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REFORÇO DAS POLÍTICAS RLS (Row Level Security)
-- Somente o MASTER_ADMIN pode criar novos membros, alterar membros ou desativá-los

DROP POLICY IF EXISTS "Líderes podem gerenciar membros" ON ministry_members;
DROP POLICY IF EXISTS "Master admin gerencia membros" ON ministry_members;
CREATE POLICY "Master admin gerencia membros" ON ministry_members
    FOR ALL
    TO authenticated
    USING (
        is_master_admin(auth.uid()) 
        OR (user_id = auth.uid() AND active = true)
    )
    WITH CHECK (
        is_master_admin(auth.uid())
    );

-- Políticas para Escalas: Somente MASTER_ADMIN cria, edita ou exclui escalas
DROP POLICY IF EXISTS "Líderes podem gerenciar escalas" ON schedules;
DROP POLICY IF EXISTS "Master admin gerencia escalas" ON schedules;
CREATE POLICY "Master admin gerencia escalas" ON schedules
    FOR ALL
    TO authenticated
    USING (
        is_master_admin(auth.uid()) 
        OR (status = 'published' AND is_ministry_member(auth.uid(), ministry_id))
    )
    WITH CHECK (
        is_master_admin(auth.uid())
    );

-- Membros comuns podem apenas atualizar sua própria confirmação de presença
DROP POLICY IF EXISTS "Membros confirmam presenca" ON schedule_members;
CREATE POLICY "Membros confirmam presenca" ON schedule_members
    FOR UPDATE
    TO authenticated
    USING (
        ministry_member_id IN (
            SELECT id FROM ministry_members WHERE user_id = auth.uid()
        )
        OR is_master_admin(auth.uid())
    )
    WITH CHECK (
        ministry_member_id IN (
            SELECT id FROM ministry_members WHERE user_id = auth.uid()
        )
        OR is_master_admin(auth.uid())
    );

-- Políticas para Louvores: Somente MASTER_ADMIN ou ministrantes criam/editam louvores
DROP POLICY IF EXISTS "Lideres gerenciam louvores" ON songs;
CREATE POLICY "Master admin gerencia louvores" ON songs
    FOR ALL
    TO authenticated
    USING (
        is_ministry_member(auth.uid(), ministry_id)
    )
    WITH CHECK (
        is_master_admin(auth.uid())
    );

-- Logs de Auditoria / Atividades do Ministério
CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id uuid REFERENCES ministries(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    user_name text,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem logs e Master insere" ON activity_logs
    FOR SELECT
    TO authenticated
    USING (is_master_admin(auth.uid()));

CREATE POLICY "Sistema insere logs" ON activity_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
