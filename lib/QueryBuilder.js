const WHERE = 'WHERE';
const LIMIT = 'LIMIT';
const COUNT = 'COUNT';
const SELECT = 'SELECT';
const OFFSET = 'OFFSET';
const DELETE = 'DELETE';
const JOIN = 'JOIN';
const PAGINATION = 'PAGINATION';

const actionsTypes = {
  SELECT:  'TRUE_FALSE_FALSE',
  COUNT: 'FALSE_TRUE_FALSE',
  WHERE: 'FALSE_FALSE_TRUE',
  DELETE: 'FALSE_FALSE_FALSE',
  LIMIT: LIMIT,
  OFFSET: OFFSET,
  SELECT_WHERE: 'TRUE_FALSE_TRUE',
  COUNT_WHERE: 'FALSE_TRUE_TRUE',
  DELETE_WHERE: 'FALSE_FALSE_TRUE'
}

class QueryBuilder {
  constructor(pool, table){
    if(!pool) throw 'Error: Nightmare Constructor "pool" is undefined';
    if(!table) throw 'Error: Nightmare Constructor "table" is undefined';
    this.columns = [];
    this.selectedColumns = ['*'];
    this.query = '';
    this.queryType = [];
    this.actionType = '';
    this.selectedCount = '';
    this.limitNum = 'NULL';
    this.offsetNum = 0;
    this.values = [];
    this.order = {column: 'id', sort: 'ASC'};
    this.pool = pool;
    this.table = table;
  }
  //
  static prepare(value){
    return (isNaN(value) && typeof value === 'string') 
      ? `'${QueryBuilder.realScape(value)}'` 
      : value; 
  }

  static realScape(str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
        }
    });
}

  where(attr){
    if( typeof attr == 'undefined') throw "Nightmare Query Builder Error: undefined parameters in the 'where' method";
    for (const key in attr) {
      if (attr.hasOwnProperty(key)) {
        const element = attr[key];
        this.queryType.push(WHERE);
        if(!this.columns.includes(key)){
          this.columns.push(key);
        }
        if(!this.values.includes(element)){
          this.values.push(element);
        }
      }
    }
    return this;
  }

  select(...args){
    if(args.length == 0) throw "Nightmare Query Builder Error: undefined args select method";
    console.log(args);
    this.selectedColumns = args;
    this.queryType.push(SELECT);
    return this;
  }

  limit(num){
    this.queryType.push(LIMIT);
    this.limitNum = num;
    return this;
  }
  offset(num){
    this.queryType.push(OFFSET);
    this.offsetNum = num;
    return this;
  }
  async delete(){
    let result;
    if(!this.queryType.includes(WHERE)) {
      if(this.id && typeof this.id !== 'undefined'){
        result = await this.pool.query(`DELETE FROM ${this.table} WHERE id=${this.id}`);
      } else { throw "Nightmare Query Error: id is undefined" }
    } else {
      result = await this.pool.query(`DELETE FROM ${this.table} WHERE ${this.setKeysAndValues()}`);
    }
    this.resetAttrs();
    return result.rowCount;
  }

  validateArgs(){
    if(this.columns.length == 0 && this.queryType.includes(WHERE)) throw "Nightmare Query Builder Error: undefined columns";
    if(this.queryType == '') throw "Nightmare Query Builder Error: undefined query";
    if(this.queryType.includes(WHERE) && this.values.length == 0) throw "Nightmare Query Builder Error: undefined values";
  }

  setKeysAndValues(){
    if(this.values.length === 1 && this.columns.length === 1){
      return `${this.columns[0]}=${QueryBuilder.prepare(this.values[0])}`;
    } else {
      return this.columns.reduce((prev, current, i, array)=>{
        let separator = (i > array.length) ? '' : 'AND';
        return (i === 1) 
          ? `${prev}=${QueryBuilder.prepare(this.values[i-1])} ${separator} ${current}=${QueryBuilder.prepare(this.values[i])}`
          : `${prev} ${separator} ${current}=${QueryBuilder.prepare(this.values[i])}`;
      });
    }
  }

  count(rowName = '*'){
    this.queryType.push(COUNT); 
    this.selectedCount = rowName;
    return this;
  }

  orderBy(column, sort = 'ASC'){
    this.order = {column, sort: sort.toUpperCase()}
    return this;
  }

  queryReducer(){
    let where = this.queryType.includes(WHERE), select = this.queryType.includes(SELECT), 
    count = this.queryType.includes(COUNT),
    result = `${select}_${count}_${where}`.toUpperCase();
    console.log(result)
    switch (result) {
      case actionsTypes.SELECT:
        this.query = `SELECT ${this.selectedColumns.toString()} FROM ${this.table}`;
        return this;
      case actionsTypes.COUNT:
        this.query = `SELECT COUNT(${this.selectedCount}) FROM ${this.table}`;
        return this;
      case actionsTypes.WHERE:
        this.query = `SELECT * FROM ${this.table} WHERE ${this.setKeysAndValues()}`;
        return this;
      case actionsTypes.SELECT_WHERE:
        this.query = `SELECT ${this.selectedColumns.toString()} FROM ${this.table} WHERE ${this.setKeysAndValues()}`;
        return this;
      case actionsTypes.COUNT_WHERE:
        this.query = `SELECT COUNT(${this.selectedCount}) FROM ${this.table} WHERE ${this.setKeysAndValues()}`;
        return this;
      default:
        throw 'Nightmare Query Error: invalid arguments or sequencing of erroneous methods';  
    }
  }

  setOrder(){
    this.query = this.query + ` ORDER BY ${this.order.column} ${this.order.sort}`;
    return this;
  }
  setLimit(){
    this.query = this.query + ` LIMIT ${this.limitNum}`;
    return this;
  }
  setOffset(){
    this.query = this.query + ` OFFSET ${this.offsetNum}`;
    return this;
  }

  resetAttrs(){
    this.columns = [];
    this.selectedColumns = ['*'];
    this.query = '';
    this.queryType = [];
    this.actionType = '';
    this.values = [];
    this.order = {column: 'id', sort: 'DESC'};
    this.selectedCount = '';
    this.limitNum = 'NULL';
    this.offsetNum = 0;
  }

  execute(){
    this.validateArgs();
    if(!this.queryType.includes(COUNT) && !this.queryType.includes(DELETE)){
      this.queryReducer().setOrder().setLimit().setOffset();
    } else {
      this.queryReducer();
    }
    let query = this.query;
    console.log(query);
    this.resetAttrs();
    return new Promise(resolve => {
      this.pool.query(query)
      .then(res => {
        if (res.rowCount > 1){
          resolve(res.rows);
        } else if(res.rowCount == 1) {
          resolve(res.rows[0]);
        } else resolve(false);
      })
      .catch(err => console.log(err));
    })
  }
}

module.exports = QueryBuilder;