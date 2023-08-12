const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Create a MySQL connection pool
const pool = mysql.createPool({
  //socketPath:"gear-1-389815:us-central1:gear-1",
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});

const PORT = 4000;
const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key';
const app = express();
app.use(cors());
app.use(express.json());

// Define a route that fetches data from the MySQL database
app.get('/', (req, res) => {
  // Acquire a connection from the pool
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting database connection:', err);
      res.status(500).send('Error getting database connection');
    } else {
      // Execute a sample query
      const query = 'SELECT * FROM garage  ';
      connection.query(query, (err, results) => {
        // Release the connection back to the pool
        connection.release();
        if (err) {
          console.error('Error executing query:', err);
          res.status(500).send('Error executing query');
        } else {
          res.json(results);
        }
      });
    }
  });
});
app.get('/users', (req, res) => {
  // Acquire a connection from the pool
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting database connection:', err);
      res.status(500).send('Error getting database connection');
    } else {
      // Execute a sample query
      const query = 'SELECT * FROM users  ';
      connection.query(query, (err, results) => {
        // Release the connection back to the pool
        connection.release();
        if (err) {
          console.error('Error executing query:', err);
          res.status(500).send('Error executing query');
        } else {
          res.json(results);
        }
      });
    }
  });
  console.log(req.body);
  const { name, surname, email, password, confirmPassword, role } = req.body;

  // Validate the request body
  if (!name || !surname || !email || !password || !confirmPassword || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Acquire a connection from the pool
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting database connection:', err);
      return res.status(500).json({ error: 'Error getting database connection' });
    }

    // Execute the query to insert the new user into the database
    const query = 'INSERT INTO users (name, surname, email, password, confirmPassword, role) VALUES (?, ?, ?, ?, ?)';
    const values = [name, surname, email, password, confirmPassword, role];

    connection.query(query, values, (err, results) => {
      // Release the connection back to the pool
      connection.release();
      if (err) {
        console.error('Error executing query:', err);
        return res.status(500).json({ error: 'Error creating user' });
      }

      // Optionally, you can return the newly created user's ID or any other relevant information
      const userId = results.insertId;
      res.status(201).json({ id: userId, message: 'users created successfully' });
    });
  });
});
app.post('/api/users', (req, res) => {
  console.log(req.body);
  const { name, surname, email, password, confirmPassword, role } = req.body;
  // Validate the request body
  if (!name || !surname || !email || !password || !confirmPassword || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Acquire a connection from the pool
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting database connection:', err);
      return res.status(500).json({ error: 'Error getting database connection' });
    }

    // Execute the query to insert the new user into the database
    const query = 'INSERT INTO users (name, surname, email, password, confirmPassword, role) VALUES (?, ?, ?, ?, ?,?)';
    const values = [name, surname, email, password, confirmPassword, role];

    connection.query(query, values, (err, results) => {
      // Release the connection back to the pool
      connection.release();
      if (err) {
        console.error('Error executing query:', err);
        return res.status(500).json({ error: 'Error creating user' });
      }

      // Optionally, you can return the newly created user's ID or any other relevant information
      const userId = results.insertId;
      console.log(userId)
      res.status(201).json({ id: userId, message: 'users created successfully' });
    });
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const userQuery = `SELECT * FROM users WHERE email = ? AND password = ?`;
  const quoteFormQuery = `SELECT * FROM quoteForm WHERE user_key IN (SELECT id FROM users WHERE email = ? AND password = ?)`;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting database connection:', err);
      return res.status(500).json({ error: 'Error getting database connection' });
    }

    connection.query(userQuery, [email, password], (err, userResults) => {
      if (err) {
        connection.release();
        console.error(err);
        res.sendStatus(500);
        return;
      }

      if (userResults.length > 0) {
        const user = userResults[0];

        connection.query(quoteFormQuery, [email, password], (err, quoteFormResults) => {
          connection.release();
          if (err) {
            console.error(err);
            res.sendStatus(500);
            return;
          }

          // Store quoteForm data in the 'quoteforms' property of the user object
          user.quoteforms = quoteFormResults;

          // Return only the user object with the quoteForm data
          res.json(user);
        });
      } else {
        // Invalid credentials
        connection.release();
        res.status(401).json({ message: 'Invalid email or password' });
      }
    });
  });
});// Protected route

app.get('/protected', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  console.log(userId);

  // Retrieve user-specific data from the database using connection pool
  pool.getConnection((err, connection) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
      return;
    }

    const query = `SELECT * FROM users WHERE Id = ?`;
    connection.query(query, [userId], (err, results) => {
      connection.release(); // Release the connection

      if (err) {
        console.error(err);
        res.sendStatus(500);
        return;
      }

      const user = results[0];
      // Perform additional actions with the user's data
      // ...
      console.log(userId, user);
      res.json({ message: 'Protected route accessed successfully', userId, user });
    });
  });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }

    req.user = user;
    next();
  });
}
app.put('/editProduct/:id', (req, res) => {
  const productId = req.params.id;
  console.log(req.body);
  const { productName, price, brand, quantity, image } = req.body;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting database connection: ', err);
      res.status(500).json({ message: 'Error updating product' });
      return;
    }

    const sql = 'UPDATE products SET productName = ?, price = ?, brand = ?, quantity = ?, image = ? WHERE id = ?';

    connection.query(sql, [productName, price, brand, quantity, image, productId], (err, result) => {
      connection.release();

      if (err) {
        console.error('Error updating product: ', err);
        res.status(500).json({ message: 'Error updating product' });
      } else {
        res.status(200).json({ message: 'Product updated successfully' });
      }
    });
  });
});
app.post('/login-admin', (req, res) => {
  const { email, password } = req.body;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to database:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }

    const query = 'SELECT COUNT(*) AS count FROM Admin WHERE email = ? AND password = ?';

    connection.query(query, [email, password], (error, results) => {
      connection.release(); // Release the connection back to the pool

      if (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const count = results[0].count;

      if (count === 1) {
        res.json({ verified: true });
      } else {
        res.json({ verified: false });
      }
    });
  });
});

app.post('/submitQuoteForm', (req, res) => {
  const formData = req.body;
  console.log(formData);
  // Map the form fields to the corresponding columns in the quoteForm table
  const newFormEntry = {
    user_key: formData.user_key,
    fullName: formData.fullName,
    email: formData.email,
    phoneNumber: formData.phoneNumber,
    plateNumber: formData.plateNumber,
    modelType: formData.modelType,
    serviceType: formData.serviceType,
    engineType: formData.engineType,
    appointmentDate: formData.appointmentDate,
    status: formData.status || "created",
  };

  // Insert the form data into the quoteForm table
  const sql = 'INSERT INTO quoteForm SET ?';

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to database:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }

    connection.query(sql, newFormEntry, (err, result) => {
      if (err) {
        console.error('Error inserting data into the quoteForm table: ', err);
        res.status(500).json({ message: 'Error submitting form data' });
      } else {
        res.status(200).json({ message: 'Form data submitted successfully' });
      }
    });
  })
});

app.get('/getQuotes', (req, res) => {
  const sql = 'SELECT * FROM quoteForm';

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool: ', err);
      res.status(500).json({ message: 'Error connecting to the database' });
      return;
    }

    connection.query(sql, (err, results) => {
      connection.release();

      if (err) {
        console.error('Error executing query: ', err);
        res.status(500).json({ message: 'Error retrieving quotes from the database' });
      } else {
        res.status(200).json(results);
      }
    });
  });
});
app.get('/getInvoice/:id', (req, res) => {
  const invoiceId = req.params.id;
  const sql = 'SELECT * FROM Invoice WHERE id = ?'; // Change 'Invoice' to your actual table name

    
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool: ', err);
      res.status(500).json({ message: 'Error connecting to the database' });
      return;
    }

    connection.query(sql, [invoiceId], (err, results) => {
      connection.release();

      if (err) {
        console.error('Error executing query: ', err);
        res.status(500).json({ message: 'Error retrieving invoice data from the database' });
      } else {
        if (results.length === 0) {
          res.status(404).json({ message: 'Invoice not found' });
        } else {
          res.status(200).json(results[0]);
        }
      }
    });
  });
});
app.get('/getMechanics', (req, res) => {
  const sql = 'SELECT * FROM mechanic';

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool: ', err);
      res.status(500).json({ message: 'Error connecting to the database' });
      return;
    }

    connection.query(sql, (err, results) => {
      connection.release();

      if (err) {
        console.error('Error executing query: ', err);
        res.status(500).json({ message: 'Error retrieving mechanic data from the database' });
      } else {
        res.status(200).json(results);
      }
    });
  });
});
app.post('/setStatusQuote/:id_quote', (req, res) => {
  const { id_quote } = req.params;
  const { id_mechanic } = req.body;
  const { sta } = req.body;

  // Update the quote's record with the id_mechanic
  const sqlUpdateQuote = 'UPDATE quoteForm SET id_mechanic = ? WHERE id = ?';
  const sqlFetchQuoteStatus = 'SELECT status FROM quoteForm WHERE id = ?';
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool: ', err);
      res.status(500).json({ message: 'Error connecting to the database' });
      return;
    }

    connection.query(sqlFetchQuoteStatus, [id_quote], (err, result) => {
      if (err) {
        connection.release();
        console.error('Error fetching quote status: ', err);
        res.status(500).json({ message: 'Error fetching quote status' });
      } else {
        // const quoteStatus = result[0].status;
        // 
        console.log(sta)
        if (sta === 'ready') {
          // Delete the assignment to the mechanic
          const sqlDeleteAssignment = 'UPDATE quoteForm SET id_mechanic = NULL WHERE id = ?';
          connection.query(sqlDeleteAssignment, [id_quote], (err, result) => {
            if (err) {
              connection.release();
              console.error('Error deleting assignment: ', err);
              res.status(500).json({ message: 'Error deleting assignment' });
            } else {
              proceedToUpdateMechanicStatus();
            }
          });
        } else {
          proceedToUpdateMechanicStatus();
        }
      }
    });

    function proceedToUpdateMechanicStatus() {
      connection.query(sqlUpdateQuote, [id_mechanic, id_quote], (err, result) => {
        if (err) {
          connection.release();
          console.error('Error updating quote record: ', err);
          res.status(500).json({ message: 'Error updating quote record' });
          return;
        }

        // Fetch all quote forms associated with the mechanic
        const sqlFetchQuoteForms = 'SELECT * FROM quoteForm WHERE id_mechanic = ?';
        connection.query(sqlFetchQuoteForms, [id_mechanic], (err, quoteForms) => {
          if (err) {
            connection.release();
            console.error('Error fetching quote forms: ', err);
            res.status(500).json({ message: 'Error fetching quote forms' });
            return;
          }
          console.log(quoteForms.length);
          const sqlUpdateMechanicStatus = 'UPDATE mechanic SET status = ? WHERE id = ?';
          if (quoteForms.length >= 4) {
            // Update the mechanic's status to 'busy'
            console.log('hey mrd')
            connection.query(sqlUpdateMechanicStatus, ['busy', id_mechanic], (err, result) => {
              if (err) {
                connection.release();
                console.error('Error updating mechanic status: ', err);
                res.status(500).json({ message: 'Error updating mechanic status' });
              } else {
                connection.release();
                res.status(200).json({ message: 'Quote status updated successfully' });
              }
            });
          } else {
            // Update the mechanic's status to 'free'
            console.log("entraaaaa", id_mechanic, sqlUpdateMechanicStatus)
            connection.query(sqlUpdateMechanicStatus, ['free', id_mechanic], (err, result) => {
              if (err) {
                connection.release();
                console.error('Error updating mechanic status: ', err);
                res.status(500).json({ message: 'Error updating mechanic status' });
              } else {
                connection.release();
                res.status(200).json({ message: 'Quote status updated successfully' });
              }
            });
          }
        });
      });
    }
  });
});




app.post('/changeStatus', (req, res) => {
  const { id, status } = req.body;

  pool.getConnection((err, connection) => {
    if (err) {
      filteredQuotes = quotes.filter((quote) => quote.status === 'Ready');
      console.error('Error getting database connection: ', err);
      res.status(500).json({ message: 'Error updating status' });
      return;
    }

    const sql = 'UPDATE quoteForm SET status = ? WHERE id = ?';

    connection.query(sql, [status, id], (err, result) => {
      connection.release();

      if (err) {
        console.error('Error updating status: ', err);
        res.status(500).json({ message: 'Error updating status' });
      } else {
        res.status(200).json({ message: 'Status updated successfully' });
      }
    });
  });
});

app.get('/getProducts', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to database:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }

    connection.query('SELECT * FROM products', (error, results) => {
      connection.release();
      if (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Failed to fetch products' });
      }

      res.json(results);
    });
  });
});

app.get('/invoice-details/:idinvoice', (req, res) => {
  const idinvoice = req.params.idinvoice;

  // Query to fetch products and their details by idinvoice from the database
  const query = `
    SELECT p.*
    FROM products p
    JOIN invoicedetails d ON p.id = d.idproducts
    WHERE d.idinvoice = ?`;

  // Use the connection pool to execute the query
  pool.query(query, [idinvoice], (err, results) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).json({ error: 'Error fetching products' });
    }

    // Return the products as a JSON response
    res.json(results);
  });
});
app.get('/invoice/:id', (req, res) => {
  const invoiceId = req.params.id;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      res.status(500).json({ message: 'Error connecting to the database' });
      return;
    }

    connection.query('SELECT * FROM invoice WHERE idusers = ?', [invoiceId], (queryErr, results) => {
      connection.release(); // Release the connection back to the pool

      if (queryErr) {
        console.error('Error fetching invoice details:', queryErr);
        res.status(500).json({ message: 'Error fetching invoice details' });
        return;
      }

      res.json(results);
    });
  });
});

// app.get('/invoice-details/:id', (req, res) => {
//   const invoiceId = req.params.id;

//   pool.getConnection((err, connection) => {
//     if (err) {
//       console.error('Error connecting to the database:', err);
//       res.status(500).json({ message: 'Error connecting to the database' });
//       return;
//     }

//     connection.query('SELECT * FROM invoicedetails WHERE idinvoice = ?', [invoiceId], (queryErr, results) => {
//       connection.release(); // Release the connection back to the pool

//       if (queryErr) {
//         console.error('Error fetching invoice details:', queryErr);
//         res.status(500).json({ message: 'Error fetching invoice details' });
//         return;
//       }

//       res.json(results);
//     });
//   });
// });

app.get('/getCarbrand', (req, res) => {
  // Get a connection from the pool
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      return res.status(500).json({ error: 'Failed to connect to the database' });
    }

    // Execute the query
    connection.query('SELECT * FROM carbrand', (error, results) => {
      // Release the connection back to the pool
      connection.release();

      if (error) {
        console.error('Error executing the query:', error);
        return res.status(500).json({ error: 'Failed to execute the query' });
      }
      res.json(results);
    });
  });
});
app.get('/getServiceType', (req, res) => {
  // Get a connection from the pool
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      return res.status(500).json({ error: 'Failed to connect to the database' });
    }

    // Execute the query
    connection.query('SELECT * FROM  servicetype', (error, results) => {
      // Release the connection back to the pool
      connection.release();

      if (error) {
        console.error('Error executing the query:', error);
        return res.status(500).json({ error: 'Failed to execute the query' });
      }

      // Send the service types as the API response
      res.json(results);
    });
  });
});

app.post('/sendBasket/:id', (req, res) => {
  // Get the basket data from the request body
  const basketData = req.body;
  const userId = req.params;
  console.log(userId.id);
  // Create a new invoice in the "invoices" table
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      res.status(500).json({ message: 'Error connecting to the database' });
      return;
    }

    // Start a new transaction
    connection.beginTransaction((transactionErr) => {
      if (transactionErr) {
        console.error('Error starting transaction:', transactionErr);
        res.status(500).json({ message: 'Error starting transaction' });
        connection.release();
        return;
      }
      const invoiceId = uuidv4();

      // Insert the invoice data into the "invoices" table
      const invoiceData = {
        id: invoiceId, // Use the generated UUID for the id field
        idusers: userId.id,
      };
      connection.query('INSERT INTO invoice SET ?', invoiceData, (insertErr, result) => {
        if (insertErr) {
          console.error('Error creating invoice:', insertErr);
          connection.rollback(() => {
            res.status(500).json({ message: 'Error creating invoice' });
            connection.release();
          });
          return;
        }

        const idinvoice = invoiceData.id;

        // Insert the invoice details into the "invoice_details" table
        const invoiceDetails = basketData.map((product) => ({
          id: uuidv4(),
          idinvoice: idinvoice,
          idproducts: product.id
        }));
        console.log(invoiceDetails);

        const values = invoiceDetails.map((detail) => Object.values(detail));
        console.log("values", values)
        connection.query('INSERT INTO invoicedetails (id, idinvoice, idproducts) VALUES ?', [values], (detailsInsertErr) => {
          if (detailsInsertErr) {
            console.error('Error creating invoice details:', detailsInsertErr);
            connection.rollback(() => {
              res.status(500).json({ message: 'Error creating invoice details' });
              connection.release();
            });
            return;
          }

          // Commit the transaction and release the connection
          connection.commit((commitErr) => {
            if (commitErr) {
              console.error('Error committing transaction:', commitErr);
              connection.rollback(() => {
                res.status(500).json({ message: 'Error committing transaction' });
                connection.release();
              });
              return;
            }

            // Transaction successfully committed
            res.status(200).json({ message: 'Invoice created successfully' });
            connection.release();
          });
        });
      });
    });
  });
});

// Start the server
console.log(PORT);
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} `);
});
