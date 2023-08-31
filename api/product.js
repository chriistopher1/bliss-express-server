const express = require("express");
const router = express.Router();

const app = express();

const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");

const { MongoClient, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Clickedbutton, Userid, Bookid");
  next();
});


app.get("/", async (req, res) => {

    try {
        res.status(200).json({message:"ok"});
    } catch (error) {
        console.error();
    }

})

const secretKey =
  "8a2bd3ec6b6a9f4dc000307e86e16e7e074642fcdc8b6b1198afdde16edef82b";

const url =
  "mongodb+srv://christopherhuu77:123@Cluster0.f3f7x2e.mongodb.net/?retryWrites=true&w=majority";

var dbName = "book_db";

const client = new MongoClient(url);

async function run() {
  try {
    await client.connect();
    console.log("Successfully connected to Atlas");
  } catch (err) {
    console.log(err.stack);
  }
}

run().catch(console.dir);

const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  // console.log("token = " + token);

  if (!token) {
    console.log("no token");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // console.log("masuk");
    const decoded = jwt.verify(token, secretKey);
    // console.log("decode = " + decoded.id);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

app.get("/verify-auth", authenticate, (req, res) => {
  res.status(200).json({ message: "Authenticated", user: req.user });
});

app.post("/login", async (req, res) => {
  const { email, password, isRemember } = req.body;

  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection("users_collection");

    const filter = { email: email };
    const document = await col.findOne(filter);

    if (!document) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Document found:\n" + JSON.stringify(document));

    const response = await bcrypt.compare(password, document.password);

    if (response) {
      const token = jwt.sign(
        { email: document.email, id: document._id },
        secretKey,
        {
          expiresIn: "1d",
        }
      );

      res.cookie("token", token, {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
      });

      console.log("Login Success");
      res.status(200).json({ message: "Login success", token: token });
    } else {
      console.log("Failed to login");
      res.status(400).json({ message: "Password is wrong" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  } finally {
    // Ensure that the client is closed in all cases
    if (client) {
      client.close();
    }
  }
});

app.post("/login/google", async (req, res) => {
  try {
    const { email, googleId, name } = req.body;

    await client.connect();
    const db = client.db(dbName);
    const col = db.collection("users_collection");

    const filter = { email: email };
    const document = await col.findOne(filter);

    if (!document) {
      let userDocument = {
        email: email,
        googleId: googleId,
        name: name,
        cart: [],
        favourite: [],
        order: [],
      };
      // Insert the document into the specified collection
      await col.insertOne(userDocument);
    }

    const filterFind = await col.findOne({ email: email });

    // Generate a JWT token using the user's email and _id
    const token = jwt.sign(
      { email: filterFind.email, id: filterFind._id },
      secretKey,
      {
        expiresIn: "1d",
      }
    );

    // Set the token as a cookie
    res.cookie("token", token, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

    console.log("Google login success");
    res.status(200).json({ message: "Login success", token: token });
  } catch (error) {
    console.error("Google login failed: " + error.message);
    res.status(400).send("Google Login Failed");
  }
});

app.post("/register", async (req, res) => {
  const { email, password, name } = req.body;

  try {
    await client.connect();
    const db = client.db(dbName);
    // Reference the "people" collection in the specified database
    const col = db.collection("users_collection");
    // Create a new document

    const document = await col.findOne({ email: email });

    if (document) {
      console.log(document.email);
      console.log("Email is taken");
      return res.status(400).send("Email is taken");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let userDocument = {
      email: email,
      password: hashedPassword,
      name: name,
      cart: [],
      favourite: [],
      order: [],
    };
    // Insert the document into the specified collection
    const response = await col.insertOne(userDocument);

    if (response) {
      console.log("User registered successfully");
      res.status(201).send("Registered successfully");
    } else {
      res.status(401).send("Register Failed");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  }
});

app.post("/get/books", async (req, res) => {
  const { category, sortby, time, searchBook } = req.body;

  if (category !== undefined) {
    try {
      await client.connect();
      const db = client.db(dbName);
      const col = db.collection("books_collection");

      // Use the find method to retrieve all documents
      const books = await col.find({ category: category }).toArray();

      // Send the books data as a JSON response
      res.status(200).json({ books });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Server error" });
    }
  } else if (sortby !== undefined) {
    if (sortby === "wished" || sortby === "viewed") {
      try {
        await client.connect();
        const db = client.db(dbName);
        const col = db.collection("books_collection");

        // Sort the books based on the "wished" or "viewed" field in descending order
        const books = await col
          .find({})
          .sort({ [sortby]: -1 })
          .toArray();

        // Send the sorted books data as a JSON response
        res.status(200).json({ books });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Server error" });
      }
    } else {
      // Handle other cases or provide an error response
      res.status(400).json({ error: "Invalid sort criteria" });
    }
  } else if (time !== undefined) {
    const currentDate = new Date();
    const sixtyDaysAgo = new Date(currentDate);
    sixtyDaysAgo.setDate(currentDate.getDate() - 60);

    try {
      await client.connect();
      const db = client.db("book_db");
      const col = db.collection("books_collection");

      let query = {};

      if (time === "new") {
        query = { published: { $gte: sixtyDaysAgo, $lte: currentDate } };
      } else if (time === "soon") {
        query = { published: { $gt: currentDate } };
      }

      const books = await col.find(query).toArray();

      res.status(200).json({ books });
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  } else if (searchBook !== null) {
    // console.log("Filter using search book");
    try {
      await client.connect();
      const db = client.db("book_db");
      const col = db.collection("books_collection");

      const regex = new RegExp(searchBook, "i");

      const books = await col.find({ title: { $regex: regex } }).toArray();

      res.status(200).json({ books });
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  } else {
    console.log("No filter criteria provided");
    try {
      await client.connect();
      const db = client.db("book_db");
      const col = db.collection("books_collection");

      const books = await col.find({}).toArray();

      res.status(200).json({ books });
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  }

  // console.log(category);
});

app.post("/get/books/usingId", async (req, res) => {
  const { arrayOfBookId } = req.body;

  // console.log(arrayOfBookId);

  try {
    await client.connect();
    const db = client.db("book_db");
    const col = db.collection("books_collection");

    const arrayOfBookIdObject = arrayOfBookId.map((id) => new ObjectId(id));

    const books = await col
      .find({ _id: { $in: arrayOfBookIdObject } })
      .toArray();

    res.status(200).json({ books: books });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  }
});

app.post("/remove/book/usingId", async (req, res) => {
  const { bookId, userEmail, info } = req.body;

  try {
    await client.connect();
    const db = client.db("book_db");
    const col = db.collection("users_collection");

    // Use $pull to remove the specified bookId from the "favourites" array
    const updateResult = await col.updateOne(
      { email: userEmail },
      { $pull: { [info]: bookId } }
    );

    if (updateResult.modifiedCount > 0) {
      // Check if any documents were modified (i.e., bookId was found and removed)
      res.status(200).json({ message: "Book removed" });
    } else {
      // No documents were modified (bookId not found in favourites)
      res.status(404).json({ message: "Book not found in favourites" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  } finally {
    // Ensure that the client is closed in all cases
    if (client) {
      client.close();
    }
  }
});

app.post("/get/userinfo", async (req, res) => {
  const { userId } = req.body;

  const userIdObject = new ObjectId(userId);

  try {
    await client.connect();
    const db = client.db("book_db");
    const col = db.collection("users_collection");

    const user = await col.findOne({ _id: userIdObject });

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      favourite: user.favourite,
      cart: user.cart,
      order: user.order,
    };

    res.status(200).json({ userData: userData });
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
});

app.post("/cardinteract", async (req, res) => {

  const {clickedButton, userId, bookId} = req.body;

  const objectId = new ObjectId(userId);

  if (clickedButton === "buy") {
    const bookIdOBject = new ObjectId(bookId);

    try {
      await client.connect();
      const db = client.db(dbName);
      const col = db.collection("books_collection");

      const response = await col.findOneAndUpdate(
        { _id: bookIdOBject },
        { $inc: { viewed: 1 } }, // Use $inc to increment the viewed field by 1
        { returnOriginal: false } // To get the updated document
      );

      if (response) {
        // The viewed field has been incremented by 1, you can access the updated document using response.value
        console.log("Viewed count incremented.");
      } else {
        console.log("Viewed count not incremented.");
      }
    } catch (error) {
      res.status(500).json({ message: "Server Error" });
    }
  } else if (clickedButton === "cart") {
    try {
      await client.connect();
      const db = client.db(dbName);
      const col = db.collection("users_collection");

      const filter = { _id: objectId };
      const document = await col.findOne(filter);

      if (!document) {
        // console.log("User not found");
        return res.status(404).json({ message: "User not found" });
      }

      const updatedDocument = await col.findOneAndUpdate(
        { _id: objectId },
        { $addToSet: { cart: bookId } },
        {
          returnOriginal: false, // To get the updated document
        }
      );

      if (updatedDocument) {
        console.log("ok");
      } else {
        console.log("not ok");
      }

      const bookCol = db.collection("books_collection");

      const bookIdObject = new ObjectId(bookId);

      const checkStock = await bookCol.findOne({ _id: bookIdObject });

      if (checkStock) {
        if (checkStock.stock < 0) {
          return res.status(400).json({ message: "Out of stock" });
        }
      } else {
        return res.status(404).json({ message: "Book Not Found" });
      }

      res.status(200).json({ message: "Book is added to Cart" });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("Server error");
    } finally {
      // Ensure that the client is closed in all cases
      if (client) {
        client.close();
      }
    }
  } else if (clickedButton === "favourite") {
    try {
      await client.connect();
      const db = client.db(dbName);
      const col = db.collection("users_collection");

      const filter = { _id: objectId };
      const document = await col.findOne(filter);

      if (!document) {
        console.log("User not found");
        return res.status(404).json({ message: "User not found" });
      }

      const updatedDocument = await col.findOneAndUpdate(
        { _id: objectId },
        { $addToSet: { favourite: bookId } },
        {
          returnOriginal: false, // To get the updated document
        }
      );

      const bookIdObject = new ObjectId(bookId);

      const bookCol = db.collection("books_collection");

      const response = await bookCol.findOneAndUpdate(
        { _id: bookIdObject },
        { $inc: { wished: 1 } }, // Use $inc to increment the viewed field by 1
        { returnOriginal: false } // To get the updated document
      );

      if (response) {
        console.log("ok mantap");
        res.status(200).json({ message: "Added to favourite" });
      } else {
        console.log("not ok");
        res.status(400).json({ message: "Failed to add book to favourite" });
      }
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("Server error");
    } finally {
      // Ensure that the client is closed in all cases
      if (client) {
        client.close();
      }
    }
  }
});

app.post("/change-password", async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  const objectId = new ObjectId(userId);

  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection("users_collection");

    const filter = { _id: objectId };
    const document = await col.findOne(filter);

    if (!document) {
      return res.status(404).json({ message: "User not found" });
    }

    const checkOldPassword = await bcrypt.compare(
      oldPassword,
      document.password
    );

    if (!checkOldPassword) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password to the new password
    const updatedDocument = await col.findOneAndUpdate(
      { _id: objectId },
      { $set: { password: newHashedPassword } }, // Update the password field
      {
        returnOriginal: false, // To get the updated document
      }
    );

    if (updatedDocument) {
      console.log("Password updated successfully");
      res.status(200).json({ message: "Password updated successfully" });
    } else {
      console.log("Failed to update password");
      res.status(500).json({ message: "Failed to update password" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  } finally {
    // Ensure that the client is closed in all cases
    if (client) {
      client.close();
    }
  }
});

app.post("/placeOrder", async (req, res) => {
  const { userId, bookIds, totalPrice } = req.body;

  const orderDate = new Date();

  const userIdObject = new ObjectId(userId);

  try {
    await client.connect();
    const db = client.db("book_db");
    const col = db.collection("orders_collection");

    const userCol = db.collection("users_collection");
    const bookCol = db.collection("books_collection");

    const user = await userCol.findOne({ _id: userIdObject });

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    for (const bookId of bookIds) {
      const bookIdObject = new ObjectId(bookId);
      const checkStock = await bookCol.findOne({ _id: bookIdObject });

      if (!checkStock) {
        console.log("Book not found");
        return res.status(404).json({ message: "Book not found" });
      }

      if (checkStock.stock < 0) {
        console.log("Out of stock");
        return res.status(400).json({ message: "Out of stock" });
      }

      const updatedStock = checkStock.stock - 1;

      await bookCol.updateOne(
        { _id: bookIdObject },
        { $set: { stock: updatedStock } }
      );
    }

    const order = {
      user: userIdObject,
      bookIds: bookIds,
      totalPrice: totalPrice,
      orderDate: orderDate,
    };

    const result = await col.insertOne(order);

    if (result) {
      console.log("Order placed successfully");
    } else {
      console.log("Error placing the order");
      return res.status(500).json({ message: "Error placing the order" });
    }

    const orderId = result.insertedId;

    const updateResult = await userCol.updateOne(
      { _id: userIdObject },
      { $push: { order: orderId }, $set: { cart: [] } }
    );

    if (updateResult.modifiedCount !== 1) {
      console.log("Error on placing order id on user document");
      return res
        .status(500)
        .send({ message: "Error inserting to user document" });
    }

    console.log("Order placed successfully");
    res.status(200).json({ message: "Order placed successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error placing the order" });
  }
});

app.post("/get/order", async (req, res) => {
  const { userOrder } = req.body;

  try {
    await client.connect();
    const db = client.db("book_db");
    const col = db.collection("orders_collection");
    const booksCol = db.collection("books_collection");

    const userOrderObject = userOrder.map((id) => new ObjectId(id));

    const allOrder = await col
      .find({ _id: { $in: userOrderObject } })
      .toArray();

    const ordersWithBooks = [];

    for (const order of allOrder) {
      const bookIds = order.bookIds.map((id) => new ObjectId(id));
      const associatedBooks = await booksCol
        .find({ _id: { $in: bookIds } })
        .toArray();

      // Add the order and its associated books to the result
      ordersWithBooks.push({
        order: order,
        books: associatedBooks,
      });
    }

    // console.log(ordersWithBooks);

    const extractedBooks = [];

    ordersWithBooks.forEach((element, index) => {
      extractedBooks[index] = element["books"];
    });

    res.status(200).json({
      message: "fetch order ok",
      allOrder: allOrder,
      extractedBooks: extractedBooks,
    });
  } catch (error) {}
});

module.exports = app;
