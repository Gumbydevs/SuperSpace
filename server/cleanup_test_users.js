const database = require('./database');

async function deleteTestUsers() {
  console.log('🗑️  Deleting test users from database...');
  
  const testUsers = [
    'testuser4', 
    'testuser3',
    
  ];

  try {
    // Initialize database connection
    await database.initDatabase();
    console.log('✅ Database connected');

    for (const username of testUsers) {
      try {
        // Delete from auth_tokens first (foreign key constraint)
        const tokenResult = await database.pool.query(
          'DELETE FROM auth_tokens WHERE username = $1',
          [username.toLowerCase()]
        );
        
        // Delete from player_data
        const playerDataResult = await database.pool.query(
          'DELETE FROM player_data WHERE username = $1',
          [username.toLowerCase()]
        );
        
        // Delete from users table
        const userResult = await database.pool.query(
          'DELETE FROM users WHERE username = $1 RETURNING username',
          [username.toLowerCase()]
        );
        
        if (userResult.rows.length > 0) {
          console.log(`✅ Deleted user: ${username}`);
          console.log(`   - Tokens deleted: ${tokenResult.rowCount}`);
          console.log(`   - Player data deleted: ${playerDataResult.rowCount}`);
        } else {
          console.log(`⚠️  User not found: ${username}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting ${username}:`, error.message);
      }
    }
    
    // Show remaining users
    const remainingUsers = await database.pool.query(
      'SELECT username, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    
    console.log('\n📊 Remaining users in database:');
    if (remainingUsers.rows.length === 0) {
      console.log('   No users remaining');
    } else {
      remainingUsers.rows.forEach(user => {
        console.log(`   - ${user.username} (created: ${user.created_at}, last login: ${user.last_login})`);
      });
    }
    
    console.log('\n🎉 Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Database operation failed:', error);
  } finally {
    // Close database connection
    if (database.pool) {
      await database.pool.end();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
}

// Run the cleanup
deleteTestUsers();