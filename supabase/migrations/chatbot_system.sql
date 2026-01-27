-- =====================================================
-- CHATBOT SYSTEM - COMPLETE DATABASE MIGRATION
-- =====================================================
-- This migration creates all necessary tables, functions, 
-- triggers, indexes, and RLS policies for the WhatsApp 
-- chatbot functionality
-- =====================================================

-- =====================================================
-- TABLES
-- =====================================================

-- 1. Chatbot Configuration Table
CREATE TABLE IF NOT EXISTS chatbot_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    welcome_message TEXT NOT NULL DEFAULT 'Bem-vindo ao Reino Burguer! 🍔',
    menu_options JSONB NOT NULL DEFAULT '[
        {"number": 1, "label": "🛒 Fazer Pedido", "action": "start_order"},
        {"number": 2, "label": "📋 Ver Cardápio", "action": "view_menu"},
        {"number": 3, "label": "📦 Rastrear Pedido", "action": "track_order"},
        {"number": 4, "label": "🕐 Horário de Funcionamento", "action": "business_hours"},
        {"number": 5, "label": "📍 Áreas de Entrega", "action": "delivery_areas"},
        {"number": 6, "label": "💳 Formas de Pagamento", "action": "payment_methods"},
        {"number": 7, "label": "🎁 Promoções", "action": "promotions"},
        {"number": 8, "label": "👤 Falar com Atendente", "action": "request_agent"}
    ]'::jsonb,
    business_hours_message TEXT DEFAULT 'Estamos funcionando! Faça seu pedido agora.',
    out_of_hours_message TEXT DEFAULT 'No momento estamos fechados. Nosso horário de funcionamento é: Segunda a Sábado, 18h às 23h.',
    is_active BOOLEAN DEFAULT true,
    handoff_keywords TEXT[] DEFAULT ARRAY['atendente', 'ajuda', 'falar com alguém', 'pessoa', 'humano'],
    auto_response_delay_ms INTEGER DEFAULT 1000,
    max_retries_before_handoff INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. Chatbot Conversations Table
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waiting_agent', 'with_agent', 'closed')),
    context JSONB DEFAULT '{}'::jsonb, -- Stores cart, current_step, last_action, etc.
    assigned_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    retry_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Chatbot Messages Table
CREATE TABLE IF NOT EXISTS chatbot_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'bot', 'agent')),
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- For agent messages
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'menu', 'order', 'interactive')),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. Chatbot Templates Table
CREATE TABLE IF NOT EXISTS chatbot_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    template_text TEXT NOT NULL,
    variables TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 5. Chatbot Analytics Table
CREATE TABLE IF NOT EXISTS chatbot_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_conversations INTEGER DEFAULT 0,
    bot_resolved INTEGER DEFAULT 0,
    agent_handoffs INTEGER DEFAULT 0,
    orders_placed INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    popular_intents JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(date)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_phone ON chatbot_conversations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_status ON chatbot_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_agent ON chatbot_conversations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation ON chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_created ON chatbot_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_templates_category ON chatbot_templates(category);
CREATE INDEX IF NOT EXISTS idx_chatbot_analytics_date ON chatbot_analytics(date DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chatbot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment analytics
CREATE OR REPLACE FUNCTION increment_chatbot_analytics(
    p_date DATE,
    p_field TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO chatbot_analytics (date)
    VALUES (p_date)
    ON CONFLICT (date) DO NOTHING;
    
    EXECUTE format('UPDATE chatbot_analytics SET %I = %I + $1 WHERE date = $2', p_field, p_field)
    USING p_increment, p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to increment retry count
CREATE OR REPLACE FUNCTION increment_retry_count(conv_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE chatbot_conversations
    SET retry_count = retry_count + 1
    WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS chatbot_config_updated_at ON chatbot_config;
CREATE TRIGGER chatbot_config_updated_at
    BEFORE UPDATE ON chatbot_config
    FOR EACH ROW
    EXECUTE FUNCTION update_chatbot_updated_at();

DROP TRIGGER IF EXISTS chatbot_conversations_updated_at ON chatbot_conversations;
CREATE TRIGGER chatbot_conversations_updated_at
    BEFORE UPDATE ON chatbot_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_chatbot_updated_at();

DROP TRIGGER IF EXISTS chatbot_templates_updated_at ON chatbot_templates;
CREATE TRIGGER chatbot_templates_updated_at
    BEFORE UPDATE ON chatbot_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_chatbot_updated_at();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert Default Configuration
INSERT INTO chatbot_config (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert Default Templates
INSERT INTO chatbot_templates (name, category, template_text, variables) VALUES
('welcome', 'greeting', '🍔 *Bem-vindo ao Reino Burguer!*

Escolha uma opção:

1️⃣ 🛒 Fazer Pedido
2️⃣ 📋 Ver Cardápio
3️⃣ 📦 Rastrear Pedido
4️⃣ 🕐 Horário de Funcionamento
5️⃣ 📍 Áreas de Entrega
6️⃣ 💳 Formas de Pagamento
7️⃣ 🎁 Promoções
8️⃣ 👤 Falar com Atendente

Digite o número da opção desejada.', ARRAY[]::TEXT[]),

('order_confirmation', 'order', '✅ *Pedido Confirmado!*

📦 Número: #{order_number}
💰 Total: R$ {total}
📍 Endereço: {address}
💳 Pagamento: {payment_method}

⏱️ Tempo estimado: {estimated_time}

Obrigado pela preferência! 🍔', ARRAY['order_number', 'total', 'address', 'payment_method', 'estimated_time']),

('order_status', 'tracking', '📦 *Status do Pedido #{order_number}*

{status_emoji} Status: {status}
⏱️ Tempo estimado: {estimated_time}

{items}

💰 Total: R$ {total}', ARRAY['order_number', 'status_emoji', 'status', 'estimated_time', 'items', 'total']),

('business_hours', 'faq', '🕐 *Horário de Funcionamento*

{hours}

Estamos ansiosos para atendê-lo! 🍔', ARRAY['hours']),

('delivery_areas', 'faq', '📍 *Áreas de Entrega*

{areas}

Se sua região não está na lista, entre em contato conosco!', ARRAY['areas']),

('payment_methods', 'faq', '💳 *Formas de Pagamento*

✅ Dinheiro
✅ PIX
✅ Cartão de Crédito
✅ Cartão de Débito

Todas as opções disponíveis na entrega! 🍔', ARRAY[]::TEXT[]),

('agent_handoff', 'system', '👤 Transferindo você para um atendente...

Aguarde um momento, em breve alguém irá atendê-lo! ⏳', ARRAY[]::TEXT[]),

('agent_joined', 'system', '✅ Você está falando com *{agent_name}*

Como posso ajudá-lo? 😊', ARRAY['agent_name']),

('invalid_option', 'error', '❌ Opção inválida.

Por favor, escolha uma opção do menu ou digite *menu* para ver as opções novamente.', ARRAY[]::TEXT[])

ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE chatbot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage chatbot config" ON chatbot_config;
DROP POLICY IF EXISTS "Admins can manage conversations" ON chatbot_conversations;
DROP POLICY IF EXISTS "Admins can manage messages" ON chatbot_messages;
DROP POLICY IF EXISTS "Admins can manage templates" ON chatbot_templates;
DROP POLICY IF EXISTS "Admins can view analytics" ON chatbot_analytics;

-- Admin can do everything
CREATE POLICY "Admins can manage chatbot config" ON chatbot_config FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can manage conversations" ON chatbot_conversations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can manage messages" ON chatbot_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can manage templates" ON chatbot_templates FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can view analytics" ON chatbot_analytics FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created: 5
-- Indexes created: 7
-- Functions created: 3
-- Triggers created: 3
-- RLS Policies created: 5
-- Default templates: 9
-- =====================================================
