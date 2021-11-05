const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require("body-parser");
const mongoose = require("mongoose")
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: "false" }));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })


const userSchema = new mongoose.Schema({
  username: {type:'string', required:true}
})

const excerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date

})

let User = mongoose.model("User", userSchema),
  Excercise = mongoose.model('Excercise', excerciseSchema);


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

function createUser({username}) {
  const handler = (resolve, reject) => {
     User.create({username}, (err,data)=> {
       if (err) reject(err)
       else resolve({username:data.username, _id:data._id.toString()})
     })
  };
  return new Promise(handler);
}

function createExcercise(username, description, duration, date) {
  const handler = (resolve, reject) => {
    Excercise.create({username, description, duration, date},
     (err, data)=> {
        if(err) reject(err)
        else {
          let date = data.date.toDateString();
          const {username, description, duration} = data;
          resolve({username, description, duration, date});
        }
      })
  };
  return new Promise(handler)
}

function getAllUsers() {
  return User.find({}).exec()
  .then(data => 
    data.map(({username,_id}) => ({username, _id:_id.toString()}))
    )
  .catch(err => err)
}

function getUser(_id) {
  return new Promise((resolve, reject) => {
    User.findOne({_id}, 'username _id', (err,data)=> {
      if(err || !data) reject(err)
      else resolve({username:data.username, _id:data._id.toString() })
    })
  })
}


function getLogs({username, _id}, {from:_from, to, limit}) {
  let query = 'description duration date';
  let where = {username};
  
  if(_from) where = {...where, date:{...where.date,$gte:_from}}
  if(to) where = {...where, date:{...where.date,$lte:to}};
  
  let options = [where, query];
  if(limit) options = [...options, {limit:Number(limit)}]
  
  const handler = (resolve, reject) => {
    Excercise.find(...options, (err, data)=> {
      if(err) reject(err)
      else {
        let count = data.length;
        let log = data.map(({description,duration,date}) => (
           {description, duration, date:date.toDateString()}
         ));
        resolve({username, count, _id, log})
      }
    })

  };
  return new Promise(handler);
}


function postExercise({_id, description, duration, date}) {
  date = date || new Date(Date.now()).toDateString();
  //console.log(_id, description, duration, date)
  return getUser(_id)
  .then(({username}) => 
    createExcercise(username, description, duration, date)
    )
  // apppend _id to results
  .then(data => ({...data, _id}))
  .catch(err => err)
}

app.post('/api/users', (req,res)=>{
  createUser(req.body)
  .then(data => res.json(data))
  .catch(err => res.json(err))
  
})

app.post('/api/users/:_id/exercises', (req, res)=> {
  postExercise({...req.params, ...req.body})
  .then(data => res.json(data))
  .catch(err => res.json(err))
})

app.get('/api/users', (req, res) => {
  getAllUsers()
  .then(data => res.json(data))
  .catch(err => res.json(err))
})

app.get('/api/users/:_id/logs', (req,res) => {
  const {_id} = req.params;
  getUser(_id)
  .then(data => getLogs(data, req.query))
  .then(data => res.json(data))
  .catch(err => res.json(err))
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
