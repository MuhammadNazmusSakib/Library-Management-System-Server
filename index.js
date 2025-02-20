require('dotenv').config();
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express()
const port = process.env.PORT || 5000


app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://library-management-syste-133af.web.app',
        'https://library-management-syste-133af.firebaseapp.com'
    ],
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
        const allBorrowedBooksDb = client.db("LibraryManagementSystem").collection('BorrowedBooks')
        const allUsersDb = client.db("LibraryManagementSystem").collection('users')


        // json web token
        app.post('/jwt', (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '5h'
            })
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
            })
                .send({ success: true })
        })

        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
            })
                .send({ success: true })
        })


        // allUsersDb---------------------------
        app.post('/users', async (req, res) => {
            const user = req.body
            // checking whether the user is old or new 
            const query = { email: user.email }
            const existingUsers = await allUsersDb.findOne(query)
            if (existingUsers) {
                return res.send({ message: 'User already exists.', insertedId: null })
            }

            const result = await allUsersDb.insertOne(user)
            res.send(result)
        })
        // working...............................
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await allUsersDb.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'Admin';
            }
            res.send({ admin });
        })

        // allBooksDb------------------
        // getting all data from database (api)
        app.get('/allBooks', verifyToken, async (req, res) => {
            const cursor = allBooksDb.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        // getting a specific data by id from database (api)
        app.get('/allBooks/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            // const query = { _id: id }
            const result = await allBooksDb.findOne(query)
            res.send(result)
        })
        // getting a specific data(based on category) from database (api)
        app.get('/allBooks/category/:type', async (req, res) => {
            const type = req.params.type
            const query = { category: type };
            const result = await allBooksDb.find(query).toArray();
            res.send(result)
        })
        // Fetch all unique categories
        app.get('/categories', async (req, res) => {
            const categories = await allBooksDb.aggregate([
                { $group: { _id: "$category" } },
                { $project: { _id: 0, category: "$_id" } },
            ]).toArray();
            res.send(categories.map(c => c.category));
        });


        // updating a specific book
        app.put('/allBooks/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const updateBook = req.body

            // Check if the authenticated user is an admin
            const email = req.user.email; // User email from decoded token
            const user = await allUsersDb.findOne({ email: email });

            if (!user || user.role !== 'Admin') {
                return res.status(403).send({ message: 'Forbidden access.' });
            }
            // Remove the _id field before updating
            delete updateBook._id;
            const result = await allBooksDb.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateBook }
            )
            res.send(result)
        })
        // storing a book 
        app.post('/allBooks', verifyToken, async (req, res) => {
            const newBook = req.body
            newBook.quantity = Number(newBook.quantity); // Ensure numeric type
            newBook.createdAt = new Date()
            
            // Check if the authenticated user is an admin
            const email = req.user.email; // User email from decoded token
            const user = await allUsersDb.findOne({ email: email });

            if (!user || user.role !== 'Admin') {
                return res.status(403).send({ message: 'Forbidden access.' });
            }

            const result = await allBooksDb.insertOne(newBook)
            res.send(result)
        })
        // update book quantity in database after borrowing
        app.put('/allBooks/borrowed/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const result = await allBooksDb.updateOne(
                { _id: new ObjectId(id) }, // Filter to match the book by ID
                { $inc: { quantity: -1 } } // Correct usage of $inc
            );
            res.send(result)
        })
        // update book quantity in database after returning
        app.put('/allBooks/returned/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const result = await allBooksDb.updateOne(
                { _id: new ObjectId(id) }, // Filter to match the book by ID
                { $inc: { quantity: 1 } } // Correct usage of $inc
            );
            res.send(result)
        })

        // allBorrowedBooksDb----------------------------------
        // storing a borrowed book 
        app.post('/allBorrowed', verifyToken, async (req, res) => {
            const borrowedBook = req.body
            borrowedBook.createdAt = new Date()
            const result = await allBorrowedBooksDb.insertOne(borrowedBook)
            res.send(result)
        })
        // getting borrowed books based on different email id
        app.get('/allBorrowed/email/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { email: email }; // Use email directly in the query

            // checking token email and query email
            if (req.user.email !== req.params.email) {
                return res.status(401).send({ message: 'Unauthorized access.' })
            }

            const result = await allBorrowedBooksDb.find(query).toArray(); // Retrieve all applications for the email
            res.send(result)
        })
        // delete borrowed book after return
        app.delete('/allBorrowed/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) }
            const result = await allBorrowedBooksDb.deleteOne(query);
            res.send({ message: 'Borrowed book removed successfully.', result });
        });





        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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