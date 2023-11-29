const express = require("express");
const app = express();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const cors = require("cors");
const cookieParser = require("cookie-parser");

// middleware
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
    credentials: true,
  })
);

// JWT Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "No token provided" });
  }
  jwt.verify(token, process.env.SECRET, function (err, decoded) {
    //err
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "Invalid token" });
    }
    //decoded
    req.user = decoded;
    next();
  });
};

// Mongodb server code

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.eykzqz7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const database = client.db("EndGame");
    const dataCollection = database.collection("ContestData");
    const userCollection = database.collection("UserData");
    const submitCollection = database.collection("SubmitData");

    // Post user details
    app.post("/user", async (req, res) => {
      const data = req.body;
      const query = { email: data.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection?.insertOne(data);
      res.send(result);
    });

    // Update user information to database
    app.put("/user/:email", async (req, res) => {
      const userEmail = req.params.email;
      const filter = { email: userEmail };
      const data = req.body;
      const updatedDoc = {
        $set: {
          name: data.name,
          email: data.email,
          role: data.role,
          contestAdded:data.contestAdded,
          photo: data.photo,
          Contest: data.Contest,
        },
      };
      // console.log(updatedDoc)
      const options = { upsert: true };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    // Get user data from database
    app.get("/user/:email", verifyToken, async (req, res) => {
      // if(req.params.email != req.user.email) {
      //   return res.status(403).send({ message: "Forbident access!!!" });
      //  }
      const userEmail = req.params.email;
      const quary = { email: userEmail };
      const result = await userCollection.findOne(quary);
      res.send(result);
    });
    // Get All user data from database
    app.get("/users", verifyToken, async (req, res) => {
      const result = await userCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // Add a Contest in the server
    app.post("/addcontest", async (req, res) => {
      const contestData = req.body;
      // console.log(contestData);
      const result = await dataCollection?.insertOne(contestData);
      res.send(result);
    });

    // Get Contest data using user email
    app.get("/allcontests", verifyToken, async (req, res) => {
      const result = await dataCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // Get all contest data for admin
    app.get("/contests/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { createdBy: email };
      const result = await dataCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // get single Contest by id
    app.get("/contest/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };
      const result = await dataCollection.findOne(quary);
      res.send(result);
    });

    // Update Contest information to database
    app.put("/contest/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const data = req.body;
      const updatedDoc = {
        $set: {
          name: data.name,
          image: data.image,
          contestPrice: data.contestPrice,
          prizeMoney: data.prizeMoney,
          details: data.details,
          instruction: data.instruction,
          contestCreator: data.contestCreator,
          createdBy: data.createdBy,
          tag: data.tag,
          status: data.status,
          participation: data.participation,
          contestDeadline: data.contestDeadline,
        },
      };
      const options = { upsert: true };
      const result = await dataCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // Delete a A Contest
    app.delete("/contest/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await dataCollection.deleteOne(query);
      res.send(result);
    });

    // get the total number of Contests
    app.get("/totalContest", async (req, res) => {
      const cat = req?.query?.cat;
      let query = { status: "Approved" };
      if (cat) {
        query = { status: "Approved", tag: cat };
      }
      const count = await dataCollection.find(query).toArray();
      res.send(count);
    });

    // Get Contest data from the database for common users
    app.get("/usersAllContest", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const cat = req?.query?.cat;
      let query = { status: "Approved" };
      if (cat) {
        query = { status: "Approved", tag: cat };
      }
      const result = await dataCollection
        .find(query)
        .sort({ _id: -1 })
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // Get the search Data from the database
    app.get("/usersAllContest/search", async (req, res) => {
      const tagName = req.query.query;
      const results = await dataCollection
        .find({ tag: { $regex: tagName, $options: "i" } })
        .toArray();
      res.send(results);
    });
    // Add a Submit data in the server
    app.post("/submit", async (req, res) => {
      const submitData = req.body;
      // console.log(submitData);
      const result = await submitCollection.insertOne(submitData);
      res.send(result);
    });

    // get single Contest by id
    app.get("/submission/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { contestID: id };
      const result = await submitCollection.find(quary).toArray();
      res.send(result);
    });

    // User API Update
    app.put("/winner/user", async (req, res) => {
      const email = req.query.email;
      const contestID = req.query.contestID;
      const filter = { email: email, "Contest.contestID": contestID };

      const query = { email: email };
      const existingUser = await userCollection.findOne(query);
      const pastWin = parseInt(existingUser.win)

      const updatedDoc = {
        $set: { "Contest.$.result": "Win", win: pastWin+1 },
      };

      const options = { upsert: true };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );

      res.send(result);
    });
  // Order API Update
    app.put("/winner/order", async (req, res) => {
      const email = req.query.email;
      const contestID = req.query.contestID;
      const filter = { userEmail: email, contestID: contestID };
      const updatedDoc = {
        $set: { userResult: "Win" },
      };

      const options = { upsert: true };
      const result = await submitCollection.updateOne(
        filter,
        updatedDoc,
        options
      );

      res.send(result);
    });


    // Get popular context
    app.get("/topContest", async (req, res) => {
      const cursor = dataCollection.find().sort({ participation: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

// Get all the winner data using submit
    app.get("/allWinsubmission", async (req, res) => {
      const quary = { userResult: "Win" };
      const result = await submitCollection.find(quary).toArray();
      res.send(result);
    });

        // Get popular context
        app.get("/topcontestance", async (req, res) => {
          const cursor = userCollection.find().sort({ contestAdded: -1 }).limit(6);
          const result = await cursor.toArray();
          res.send(result);
        });
    
        

// Get top win user for leaderboard
app.get('/leaderboard', async(req, res) =>{
  const cursor = userCollection.find().sort({ win: -1 });
  const result = await cursor.toArray();
  res.send(result);
});
















    // JWT
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET, { expiresIn: "24h" });
      // const expirationDate = new Date();
      // expirationDate.setDate(expirationDate.getDate() + 7);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          // expires: expirationDate,
        })
        .send({ msg: "Succeed" });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
