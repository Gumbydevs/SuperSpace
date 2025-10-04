const database = require('./database');

async function deleteTestUsers() {
  const logger = require('./logger');
  logger.info('🗑️  Deleting test users from database...');
  
  const testUsers = [
    'testuser4', 
    'testuser3',
    
  ];

  try {
    // Initialize database connection
  await database.initDatabase();
  logger.info('✅ Database connected');

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
          logger.info(`✅ Deleted user: ${username}`);
          logger.info(`   - Tokens deleted: ${tokenResult.rowCount}`);
          logger.info(`   - Player data deleted: ${playerDataResult.rowCount}`);
        } else {
          logger.warn(`⚠️  User not found: ${username}`);
        }
      } catch (error) {
  logger.error(`❌ Error deleting ${username}:`, error.message);
      }
    }
    
    // Show remaining users
    const remainingUsers = await database.pool.query(
      'SELECT username, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    
    logger.info('\n📊 Remaining users in database:');
    if (remainingUsers.rows.length === 0) {
      logger.info('   No users remaining');
    } else {
      remainingUsers.rows.forEach(user => {
        logger.info(`   - ${user.username} (created: ${user.created_at}, last login: ${user.last_login})`);
      });
    }
    
    logger.info('\n🎉 Cleanup complete!');
    
  } catch (error) {
  logger.error('❌ Database operation failed:', error);
  } finally {
    // Close database connection
    if (database.pool) {
  await database.pool.end();
  logger.info('🔌 Database connection closed');
    }
    process.exit(0);
  }
}

// Run the cleanup
deleteTestUsers();