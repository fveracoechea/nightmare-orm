const Nightmare = require('./app');
const pool = require('./../functions/getConnectionPool');

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