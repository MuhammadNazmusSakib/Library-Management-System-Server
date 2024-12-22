require('dotenv').config();
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express()
const port = process.env.PORT || 5000


app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(cookieParser())
app.use(express.json())


const verifyToken = (req, res, next) => {
    const token = req.cookies?.token

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access.' })
    }
    // verify the token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access.' })
        }
        req.user = decoded
        next()
    })
}




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_PASS}@cluster0.m594l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const allBooksDb = client.db("LibraryManagementSystem").collection('Books')

        // jwt
        app.post('/jwt', (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '5h'
            })
            res.cookie('token', token, {
                httpOnly: true,
                secure: false
            })
                .send({ success: true })
        })

        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: false
            })
                .send({ success: true })
        })


        // allBooksDb------------------
        // getting all data from database (api)
        app.get('/allBooks', async (req, res) => {
            const cursor = allBooksDb.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        // getting a specific data by id from database (api)
        app.get('/allBooks/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            // const query = { _id: id }
            const result = await allBooksDb.findOne(query)
            res.send(result)
        })
        // getting all unique categories -------------------Working-------------------------
        app.get('/allBooks/categories', async (req, res) => {
            // Fetch distinct categories directly from MongoDB
            const categories = await allBooksDb.distinct('category');
            res.send(categories); // Send the unique categories directly
        });

        // getting a specific data(based on category) from database (api)
        app.get('/allBooks/category/:type', async (req, res) => {
            const type = req.params.type
            const query = { category: type };
            const result = await allBooksDb.find(query).toArray();
            res.send(result)
        })
        // updating a specific book
        app.put('/allBooks/:id', async (req, res) => {
            const id = req.params.id
            const updateBook = req.body
            // Remove the _id field before updating
            delete updateBook._id;
            console.log('sss', updateBook)
            const result = await allBooksDb.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateBook }
            )
            res.send(result)
        })




        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);







app.get('/', (req, res) => {
    res.send('Server is RUNNING...')
})

app.listen(port, () => {
    console.log(`Server is waiting at ${port}`)
})