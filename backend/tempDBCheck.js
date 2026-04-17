// tempDBCheck.js
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const Track = require('./src/models/Track');
    const tracks = await Track.find();
    console.log('Number of tracks in DB:', tracks.length);
    if(tracks.length > 0) {
      console.log('Status example:', tracks[0].status);
    }
    
    // Check old database named 'test'
    const oldUri = process.env.MONGODB_URI.replace('/soundjudge?', '/test?');
    const oldConn = await mongoose.createConnection(oldUri, { useNewUrlParser: true, useUnifiedTopology: true });
    
    const countTest = await oldConn.collection('tracks').countDocuments();
    console.log('Number of tracks in TEST DB:', countTest);
    
    process.exit(0);
  });
