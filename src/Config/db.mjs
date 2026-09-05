import mongoose from "mongoose";


// here setup mongodb 
// making maxpool of 10
// making all not nessassary process **reading** on secondary replication 
export const connectDb = async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: Number.parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "10000", 10),
            maxPoolSize:10,
            minPoolSize:2,
            readPreference:"secondaryPreferred"
        });
        console.log("============Database connection==============");
        console.log("The database is connected\n");
    } catch (error) {
        console.error(`Database connection failed: ${error.message}`);
        throw error;
    }
};
