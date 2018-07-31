const SELECT = 'SELECT';  // 1
const COUNT = 'COUNT';    // 2
const WHERE = 'WHERE';    // 3
const JOIN = 'JOIN';      // 4
const LIMIT = 'LIMIT';
const OFFSET = 'OFFSET';
const DELETE = 'DELETE';
const ORDERBY = 'ORDERBY';
const PAGINATION = 'PAGINATION';

const actionsTypes = {
  SELECT:              'TRUE_FALSE_FALSE_FALSE',// 1
  COUNT:               'FALSE_TRUE_FALSE_FALSE',// 2
  WHERE:               'FALSE_FALSE_TRUE_FALSE', // 3
  LIMIT:               LIMIT,
  OFFSET:              OFFSET,
  SELECT_WHERE:        'TRUE_FALSE_TRUE',
  SELECT_JOIN:         'TRUE_FALSE_FALSE_TRUE',
  COUNT_WHERE:         'FALSE_TRUE_TRUE',
  SELECT_JOIN_WHERE:   'TRUE_FALSE_TRUE_TRUE'
}

class QueryBuilder {
  constructor(pool, table){
    if(!pool) throw new Error('Nightmare Constructor "pool" is undefined');
    if(!table) throw new Error('Nightmare Constructor "table" is undefined');
    this.columns = [];
    this.selectedColumns = ['*'];
    this.query = '';
    this.queryType = [];
    this.selectedCount = '';
    this.limitNum = 'NULL';
    this.offsetNum = 0;
    this.values = [];
    this.order = {column: 'id', sort: 'ASC'};
    this.pool = pool;
    this.table = table;
    this.joins = [];
  }
  //
  static prepare(value, isJson = false){
    if (isJson && typeof value === 'object'){
      return JSON.stringify(value);
    }
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

  where(attr = {}){
    if( typeof attr == 'undefined') throw new Error("Nightmare Query Builder undefined parameters in the 'where' method");
    for (const key in attr) {
      if (attr.hasOwnProperty(key)) {
        const element = attr[key];
        this.queryType.push(WHERE);
        if(typeof element == 'object'){
          for (const keyChild in element) {
            if (element.hasOwnProperty(keyChild)) {
              const elementChild = element[keyChild];
              if(!this.values.includes(elementChild)){
                this.values.push(elementChild);
              }
              if(!this.columns.includes(keyChild)){
                this.columns.push(`${key}.${keyChild}`);
              }
            }
          }
        } else {
          if(!this.columns.includes(key)){
            this.columns.push(key);
          }
          if(!this.values.includes(element)){
            this.values.push(element);
          }
        }
      }
    }
    return this;
  }

  join(table, on, equal){
    this.queryType.push(JOIN);
    this.joins.push(`JOIN ${table} ON (${on}=${equal})`);
    return this;
  }

  select(...args){
    if(args.length == 0) throw new Error("Nightmare Query Builder undefined args select method");
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
      } else { throw new Error("Nightmare Query id is undefined") }
    } else {
      result = await this.pool.query(`DELETE FROM ${this.table} WHERE ${this.setKeysAndValues()}`);
    }
    this.resetAttrs();
    return result.rowCount;
  }

  validateArgs(){
    if(this.columns.length == 0 && this.queryType.includes(WHERE)) throw new Error("Nightmare Query Builder undefined columns");
    if(this.queryType == '') throw new Error("Nightmare Query Builder undefined query");
    if(this.queryType.includes(WHERE) && this.values.length == 0) throw new Error("Nightmare Query Builder undefined values");
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
    this.queryType.push(ORDERBY);
    this.order = {column, sort: sort.toUpperCase()}
    return this;
  }
  
  joinReducer(){
    return this.joins.reduce((prevValue, nextValue) => `${prevValue} ${nextValue}`);
  }


  queryReducer(){                   
    let where = this.queryType.includes(WHERE), select = this.queryType.includes(SELECT), 
    count = this.queryType.includes(COUNT), join = this.queryType.includes(JOIN),
    //             1        2         3       4
    result = `${select}_${count}_${where}_${join}`.toUpperCase();
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
      case actionsTypes.SELECT_JOIN:
        this.query = `SELECT ${this.selectedColumns.toString()} FROM ${this.table} ${this.joinReducer()}`;
        return this;
      case actionsTypes.SELECT_JOIN_WHERE:
        this.query = `SELECT ${this.selectedColumns.toString()} FROM ${this.table} ${this.joinReducer()} WHERE ${this.setKeysAndValues()}`;
        return this;
      default:
        throw new Error('Nightmare Query invalid arguments or sequencing of erroneous methods');  
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
    this.values = [];
    this.order = {column: 'id', sort: 'DESC'};
    this.selectedCount = '';
    this.limitNum = 'NULL';
    this.offsetNum = 0;
  }

  execute(){
    this.validateArgs();
    this.queryReducer();
    if(this.queryType.includes(ORDERBY)){
      this.setOrder();
    }
    if( (!this.queryType.includes(COUNT) && !this.queryType.includes(DELETE)) &&
        (this.queryType.includes(LIMIT) || this.queryType.includes(OFFSET)) ){
      this.setLimit().setOffset();
    }
    let query = this.query;
    this.resetAttrs();
    return new Promise((resolve, reject) => {
      this.pool.query(query)
      .then(res => {
        if (res.rowCount > 1){
          resolve(res.rows);
        } else if(res.rowCount == 1) {
          resolve(res.rows[0]);
        } else resolve(false);
      })
      .catch(err => reject(err));
    })
  }
}

module.exports = QueryBuilder;
