-- Script de Verificação do Banco de Dados
-- Execute este script no Supabase SQL Editor para verificar o que está faltando

-- 1. Verificar se a tabela transactions existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions')
        THEN '✅ Tabela transactions existe'
        ELSE '❌ FALTANDO: Tabela transactions - Execute financial_setup.sql'
    END as status_transactions;

-- 2. Verificar colunas de estoque
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'track_stock')
        THEN '✅ Coluna track_stock existe'
        ELSE '❌ FALTANDO: Coluna track_stock - Execute add_stock_columns.sql'
    END as status_track_stock;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_quantity')
        THEN '✅ Coluna stock_quantity existe'
        ELSE '❌ FALTANDO: Coluna stock_quantity - Execute add_stock_columns.sql'
    END as status_stock_quantity;

-- 3. Verificar taxas separadas
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_config' AND column_name = 'card_debit_fee_percent')
        THEN '✅ Coluna card_debit_fee_percent existe'
        ELSE '❌ FALTANDO: Coluna card_debit_fee_percent - Execute add_split_fees.sql'
    END as status_debit_fee;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_config' AND column_name = 'card_credit_fee_percent')
        THEN '✅ Coluna card_credit_fee_percent existe'
        ELSE '❌ FALTANDO: Coluna card_credit_fee_percent - Execute add_split_fees.sql'
    END as status_credit_fee;

-- 4. Verificar buckets de storage
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'products')
        THEN '✅ Bucket products existe'
        ELSE '⚠️ OPCIONAL: Bucket products - Execute storage_setup.sql para upload de imagens'
    END as status_products_bucket;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'store-assets')
        THEN '✅ Bucket store-assets existe'
        ELSE '⚠️ OPCIONAL: Bucket store-assets - Execute storage_setup.sql para upload de imagens'
    END as status_store_assets_bucket;
