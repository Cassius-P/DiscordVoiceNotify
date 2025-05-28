const logger = require('./src/utils/logger');
const databaseClient = require('./src/database/client');
const sessionService = require('./src/services/sessionService');
const messageUpdateService = require('./src/services/messageUpdateService');

/**
 * Test script for DM message modification feature
 */
async function testDMModificationFeature() {
  logger.info('Starting DM modification feature tests...');
  
  try {
    // Test 1: Database schema validation
    logger.info('Test 1: Validating database schema...');
    await testDatabaseSchema();
    
    // Test 2: Session service functionality
    logger.info('Test 2: Testing session service...');
    await testSessionService();
    
    // Test 3: Message formatter with new templates
    logger.info('Test 3: Testing message formatting...');
    testMessageFormatting();
    
    logger.info('✅ All DM modification feature tests passed!');
    
  } catch (error) {
    logger.error('❌ DM modification feature tests failed:', error);
    throw error;
  }
}

/**
 * Test database schema changes
 */
async function testDatabaseSchema() {
  try {
    const prisma = databaseClient.getClient();
    
    // Test ChannelSession model
    logger.debug('Testing ChannelSession model...');
    const testSession = await prisma.channelSession.findMany({ take: 1 });
    logger.debug('ChannelSession model accessible ✓');
    
    // Test NotificationState model updates
    logger.debug('Testing updated NotificationState model...');
    const testNotification = await prisma.notificationState.findMany({ take: 1 });
    logger.debug('Updated NotificationState model accessible ✓');
    
    logger.info('✅ Database schema validation passed');
  } catch (error) {
    logger.error('❌ Database schema validation failed:', error);
    throw error;
  }
}

/**
 * Test session service functionality
 */
async function testSessionService() {
  try {
    // Test session ID generation
    const sessionId1 = sessionService.generateSessionId();
    const sessionId2 = sessionService.generateSessionId();
    
    if (!sessionId1 || !sessionId2 || sessionId1 === sessionId2) {
      throw new Error('Session ID generation failed');
    }
    logger.debug('Session ID generation ✓');
    
    // Test user list formatting
    const mockUsers = new Map([
      ['123', { id: '123', user: { username: 'testuser1', avatar: null }, displayName: 'TestUser1' }],
      ['456', { id: '456', user: { username: 'testuser2', avatar: null }, displayName: 'TestUser2' }]
    ]);
    
    const formattedList = sessionService.formatUserListForStorage(mockUsers);
    if (!Array.isArray(formattedList) || formattedList.length !== 2) {
      throw new Error('User list formatting failed');
    }
    logger.debug('User list formatting ✓');
    
    // Test cache functionality
    sessionService.clearCache();
    logger.debug('Session cache management ✓');
    
    logger.info('✅ Session service tests passed');
  } catch (error) {
    logger.error('❌ Session service tests failed:', error);
    throw error;
  }
}

/**
 * Test message formatting with new templates
 */
function testMessageFormatting() {
  try {
    const MessageFormatter = require('./src/utils/messageFormatter');
    
    // Test new template format
    const template = '🔊 Users in {channelName}: {userList} {emoji}';
    const data = {
      channelName: 'General Voice',
      userList: 'Alice, Bob, and 2 others',
      emoji: '🎮'
    };
    
    const formatted = MessageFormatter.formatNotificationMessage(template, data);
    const expected = '🔊 Users in General Voice: Alice, Bob, and 2 others 🎮';
    
    if (formatted !== expected) {
      throw new Error(`Message formatting failed. Expected: "${expected}", Got: "${formatted}"`);
    }
    logger.debug('New template formatting ✓');
    
    // Test user list formatting
    const usernames = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank'];
    const formatted3 = MessageFormatter.formatUserList(usernames, 3);
    if (!formatted3.includes('and 3 others')) {
      throw new Error('User list truncation failed');
    }
    logger.debug('User list truncation ✓');
    
    logger.info('✅ Message formatting tests passed');
  } catch (error) {
    logger.error('❌ Message formatting tests failed:', error);
    throw error;
  }
}

/**
 * Test message update service queue functionality
 */
function testMessageUpdateService() {
  try {
    // Test queue functionality
    let testExecuted = false;
    const testFunction = async () => {
      testExecuted = true;
    };
    
    messageUpdateService.queueUpdate('test-key', testFunction, 100);
    
    setTimeout(() => {
      if (!testExecuted) {
        throw new Error('Queue update execution failed');
      }
      logger.debug('Message update queue ✓');
    }, 200);
    
    // Test queue size
    const queueSize = messageUpdateService.getQueueSize();
    if (typeof queueSize !== 'number') {
      throw new Error('Queue size reporting failed');
    }
    logger.debug('Queue size reporting ✓');
    
    logger.info('✅ Message update service tests passed');
  } catch (error) {
    logger.error('❌ Message update service tests failed:', error);
    throw error;
  }
}

/**
 * Main test execution
 */
async function runTests() {
  try {
    // Connect to database
    await databaseClient.connect();
    
    // Run tests
    await testDMModificationFeature();
    
    // Test message update service
    testMessageUpdateService();
    
    logger.info('🎉 All DM modification feature tests completed successfully!');
    
  } catch (error) {
    logger.error('💥 Test execution failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await databaseClient.disconnect();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testDMModificationFeature,
  testDatabaseSchema,
  testSessionService,
  testMessageFormatting
};
