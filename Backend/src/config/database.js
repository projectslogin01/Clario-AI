import mongoose from 'mongoose';

/**
 * Opens the MongoDB connection used by the Express app.
 * The server startup file handles process exit if this promise rejects.
 */
export async function connectToDB(){
  mongoose.connect(process.env.MONGO_URI)
  .then(()=>{
    console.log('CONNECTED TO DB')
  })
}
