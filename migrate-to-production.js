const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Supabase Production credentials
const SUPABASE_URL = 'https://adquuzqndcgninjtkllm.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcXV1enFuZGNnbmluanRrbGxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg1NjEyMywiZXhwIjoyMDg1NDMyMTIzfQ.8a-jxQu28Zf083HYmiLagHKeVwE6M4MZBOcO9XhckMM'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function loadJSON(filename) {
  try {
    const content = fs.readFileSync(`/tmp/${filename}`, 'utf8').trim()
    if (!content || content === '' || content === 'null') return []
    return JSON.parse(content) || []
  } catch (e) {
    console.log(`Warning: Could not load ${filename}:`, e.message)
    return []
  }
}

async function migrateTable(tableName, data, options = {}) {
  if (!data || data.length === 0) {
    console.log(`⏭️  ${tableName}: No data to migrate`)
    return true
  }

  console.log(`📤 Migrating ${tableName}: ${data.length} records...`)
  
  try {
    // Delete existing data first if specified
    if (options.truncate) {
      const { error: delError } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (delError && !delError.message.includes('row')) {
        console.log(`  Warning deleting ${tableName}:`, delError.message)
      }
    }

    // Insert in batches of 100
    const batchSize = 100
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      const { error } = await supabase.from(tableName).upsert(batch, { onConflict: 'id' })
      if (error) {
        console.log(`  ❌ Error in ${tableName} batch ${i}:`, error.message)
        return false
      }
    }
    
    console.log(`  ✅ ${tableName}: ${data.length} records migrated`)
    return true
  } catch (e) {
    console.log(`  ❌ Error migrating ${tableName}:`, e.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting migration to Supabase Production...\n')
  console.log('URL:', SUPABASE_URL)
  console.log('')

  // Test connection
  const { data: testData, error: testError } = await supabase.from('products').select('count').limit(1)
  if (testError && !testError.message.includes('does not exist')) {
    console.log('❌ Connection test failed:', testError.message)
    console.log('\n⚠️  Make sure the tables exist in production!')
    console.log('   Go to Supabase Dashboard > SQL Editor and run the schema first.\n')
  } else {
    console.log('✅ Connection successful!\n')
  }

  // Load all data
  const stores = await loadJSON('stores.json')
  const categories = await loadJSON('categories.json')
  const users = await loadJSON('users.json')
  const clients = await loadJSON('clients.json')
  const products = await loadJSON('products.json')
  const sales = await loadJSON('sales.json')
  const saleItems = await loadJSON('sale_items.json')
  const companyConfig = await loadJSON('company_config.json')
  const logs = await loadJSON('logs.json')

  console.log('📊 Data loaded:')
  console.log(`   - Stores: ${stores.length}`)
  console.log(`   - Categories: ${categories.length}`)
  console.log(`   - Users: ${users.length}`)
  console.log(`   - Clients: ${clients.length}`)
  console.log(`   - Products: ${products.length}`)
  console.log(`   - Sales: ${sales.length}`)
  console.log(`   - Sale Items: ${saleItems.length}`)
  console.log(`   - Company Config: ${companyConfig.length}`)
  console.log(`   - Logs: ${logs.length}`)
  console.log('')

  // Migrate in order (respecting foreign keys)
  console.log('📥 Migrating data...\n')
  
  await migrateTable('stores', stores)
  await migrateTable('categories', categories)
  await migrateTable('users', users)
  await migrateTable('clients', clients)
  await migrateTable('products', products)
  await migrateTable('company_config', companyConfig)
  await migrateTable('sales', sales)
  await migrateTable('sale_items', saleItems)
  await migrateTable('logs', logs)

  console.log('\n🎉 Migration complete!')
  console.log('\n📝 Next steps:')
  console.log('   1. Update .env.local with production Supabase credentials')
  console.log('   2. Deploy the app to Vercel')
  console.log('   3. Test the production app')
}

main().catch(console.error)
