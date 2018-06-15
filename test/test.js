const Nightmare = require('./../lib/app');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'oxoftmed_myscout',
  password: '1',
  port: 5432
});

class profiles extends Nightmare {
  constructor(){
    super(pool, 'profiles');
    this.attributes = ['name']
  }

  async all(){
    let result  = await this.select('*').limit(2).execute();
    console.log(result);
  }
}

let pro = new profiles();
pro.count("*")
.where({
  type: 'TALENT'
})
.execute()
.then(result => console.log(result));