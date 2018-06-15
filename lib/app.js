'use strict';
const QueryBuilder = require('./QueryBuilder');

class Nightmare extends QueryBuilder{
  constructor(pool, table, data = false){
    if(!pool) throw 'Error: Nightmare Constructor "pool" is undefined';
    if(!table) throw 'Error: Nightmare Constructor "table" is undefined';
    super(pool, table);
    this.pool = pool;
    this.table = table;
    this.attributes = [];
    if(data && typeof data === 'object') this.fill(data);
  }
  //fill json data to instance of Nigthmare object
  fill(row){
    if(row){
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          const element = row[key];
          this[key] = element;
          if(key !== 'created_at' && key !== 'updated_at' && key !== 'id' && !this.attributes.includes(key)){
            this.attributes.push(key);
          }
        }
      }
      return this;
    } else { throw 'Error: fill method, row data is undefined' }
  }

  //Find by id (standart primary key)
  find(id){
    return new Promise(resolve => {
      this.pool.query(`SELECT * FROM ${this.table} WHERE id=${id} LIMIT 1`)
      .then( res =>{
        this.fill(res.rows[0]);
        resolve(this);
      })
      .catch(err => { throw err });
    })
  }
  //
  attributesValuesToSring(){
    if(this.attributes !== [] && this.attributes.length !== 0){
      if(this.attributes.length == 1){
        return this.prepare(this[this.attributes[0]]);
      } 
      return this.attributes.reduce((prev, current, i, array)=>{
        let separator = (i > array.length) ? '' : ',';
        return (i === 1) ? `${this.prepare(this[prev])}${separator}${this.prepare(this[current])}` : `${prev}${separator}${this.prepare(this[current])}`;
      });
    } else { throw 'Error: attributes are not defined!' }
  }
  //Insert data Object in database
  insert(){
    let query=`INSERT INTO ${this.table} (${this.attributes.toString()}) VALUES(${this.attributesValuesToSring()}) RETURNING *`;
    return new Promise(resolve => {
      this.pool.query(query)
      .then(res => {
        this.fill(res.rows[0]);
        resolve(this)
      })
      .catch(err => {throw err});
    });
  }

  //update data Object in database
  update(){
    let query = this.attributes.length == 1 
      ? `UPDATE ${this.table} SET ${this.attributes.toString()} = ${this.attributesValuesToSring()} WHERE id=${this.id} RETURNING *`
      : `UPDATE ${this.table} SET (${this.attributes.toString()}) = (${this.attributesValuesToSring()}) WHERE id=${this.id} RETURNING *`;
    return new Promise(resolve => {
      this.pool.query(query)
      .then(res => {
        this.fill(res.rows[0]);
        resolve(this)
      })
      .catch(err => {throw err});
    });
  }

  //Save Execute Insert Or Update depending of the objebct data
  save(){
    if(this.id && typeof this.id !== 'undefined' && this.attributes !== []){
      return this.update();
    } else {
      return this.insert();
    }
  }

  delete(rowName = false, rowValue = false){
    if((this.id && typeof this.id !== 'undefined' && this.attributes !== []) || rowName && rowValue){
      let query = (rowName && rowValue) 
        ? `DELETE FROM ${this.table} WHERE ${rowName}=${this.prepare(rowValue)}`
        : `DELETE FROM ${this.table} WHERE id=${this.id}`;
      return new Promise(resolve => {
        this.pool.query(query)
        .then(res => resolve(res.rowCount));
      })
    } else {
      throw "Error: Nightmare.id and/or Nightmare.attributes are not defined";
    }
  }

  async execute(returnIntance = false){
    let data = await super.execute()
    if(data instanceof Array){
      if(returnIntance){
        return data.map(el => {
          let obj = new Nightmare(this.pool, this.table);
          return obj.fill(el);
        })
      }
    } else {
      if(returnIntance){
        let obj = new Nightmare(this.pool, this.table);
        return (data) ? obj.fill(data) : data;
      }
    }
    return data;
  }
}

module.exports = Nightmare;

