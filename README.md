# PixiDB

A small all-in-memory database with background file writing.

## Basic Example
```
// Types for saftey and completion
interface User {
  id: string;
  age: number;
}

// Make an object that will house all your tables
export const db = {
  users: new Table<User>('/path/to/db/dir', 'users')
}

db.users.set({
  id: 'cool_guy',
  age: 42
})
let arr = db.users.getAll()
let arr = db.users.get((v) => v.age > 10)
let user = db.users.getOne('cool_guy')
```

## Schemas
You can define a schema for a table with the .schema().

Doing so will enable validation checking on all .set() and .new() calls.
```
let users = new Table('users', null).schema({
  id: 'string',
  age: 'number',
  verified: 'boolean',
})

Schema objects can also be nested like so:
{
  id: 'string',
  age: 'number',
  settings: {
    darkmode: 'boolean',
    volume: 'number'
  }
}
```
Valid types:
- any
- string
- number
- boolean
- array
- object (defined as above)

## Logging and Debugging

There is a static property in the Table class to set the level of logging for all tables, you can set like this:

```
Table.loglevel = LogLevel.None
```
The levels are:
- **None** (default)
- **Init** (shows table initialisation info)
- **Operations** (shows table operations)
- **Verbose** (lots of info for debugging)