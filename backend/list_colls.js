const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/healpath');
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('COLLECTIONS:', collections.map(c => c.name));
  
  for (let c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(c.name, count);
  }
  mongoose.disconnect();
}
check();
