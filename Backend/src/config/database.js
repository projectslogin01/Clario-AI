import mongoose from 'mongoose';

export async function connectToDB(){
  mongoose.connect(process.env.MONGO_URI)
  .then(()=>{
    console.log('CONNECTED TO DB')
  })
}
