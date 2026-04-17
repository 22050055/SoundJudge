const mongoose = require('mongoose');

// The direct replica-set string without +srv which bypasses DNS SRV lookups completely
const MONGODB_URI = 'mongodb://22050055_db_user:khang123@ac-d6rjy8v-shard-00-00.e2kn7mt.mongodb.net:27017,ac-d6rjy8v-shard-00-01.e2kn7mt.mongodb.net:27017,ac-d6rjy8v-shard-00-02.e2kn7mt.mongodb.net:27017/?ssl=true&replicaSet=atlas-d6rjy8v-shard-0&authSource=admin&retryWrites=true&w=majority';

async function testConnection() {
  try {
    console.log('Connecting to MongoDB using standard URI...');
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Success!');
    
    // Test count
    const tracks = await mongoose.connection.collection('tracks').countDocuments();
    console.log(`Tracks in DB: ${tracks}`);

    process.exit(0);
  } catch(e) {
    console.error('Failed', e);
    process.exit(1);
  }
}
testConnection();
