// const mongoose = require('mongoose');
// var mongoURL = 'mongodb+srv://alifahmed102:VSzix877BjOwXUQy@cluster0.30z9ip6.mongodb.net/Booking'
// mongoose.connect(mongoURL, {useUnifiedTopology: true, useNewUrlParser: true})
// var connection = mongoose.connection
// connection.on('error', ()=>{
//     console.log('mongo error')
// })
// connection.on('connected', ()=>{
//     console.log('mongo success')
// })
// module.exports = mongoose

const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')
const port = process.env.PORT || 5000

// middleware
app.use(cors({
    origin : [
       'http://localhost:5173', 'https://hotel-booking-mern-c8edc.web.app' , 'https://hotel-booking-mern-c8edc.firebaseapp.com'
    ],
    credentials: true
   }));
app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))


const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.30z9ip6.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
async function run() {
  try {
    const usersCollection = client.db('stayVistaDb').collection('users')
    const roomsCollection = client.db('stayVistaDb').collection('rooms')
    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      console.log('I need a new jwt', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })

    // Save or modify user email, status in DB
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email: email }
      const options = { upsert: true }
      const isExist = await usersCollection.findOne(query)
      console.log('User found?----->', isExist)
      if (isExist) return res.send(isExist)
      const result = await usersCollection.updateOne(
        query,
        {
          $set: { ...user, timestamp: Date.now() },
        },
        options
      )
      res.send(result)
    })

    // Get user role
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const result = await usersCollection.findOne({ email })
      res.send(result)
    })

    // Get all rooms
    app.get('/rooms', async (req, res) => {
      const result = await roomsCollection.find().toArray()
      res.send(result)
    })

    //get rooms for host
    app.get('/rooms/:email', async (req, res) => {
      const email = req.params.email
      const result = await roomsCollection
        .find({ 'host.email': email })
        .toArray()
      res.send(result)
    })

    // Get single room data
    app.get('/room/:id', async (req, res) => {
      const id = req.params.id
      const result = await roomsCollection.findOne({ _id: new ObjectId(id) })
      res.send(result)
    })

    // Save a room in database
    app.post('/rooms', verifyToken, async (req, res) => {
      const room = req.body
      const result = await roomsCollection.insertOne(room)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from StayVista Server..')
})

app.listen(port, () => {
  console.log(`StayVista is running on port ${port}`)
})