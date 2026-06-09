require('dotenv').config();
const fs = require('fs');
const path = require('path');
const neo4jConnection = require('./connection');
const logger = require('../../utils/logger');

const DATA_DIR = path.join(__dirname, '../../../../data');

function parseCSV(filename) {
  const filepath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filepath, 'utf-8').trim().split('\\n');
  const headers = raw[0].split(',').map((h) => h.trim());
  return raw.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

async function runSeed() {
  let driver;
  try {
    driver = await neo4jConnection.connect();
    const session = driver.session();

    logger.info('Clearing existing graph...');
    await session.run('MATCH (n) DETACH DELETE n');

    logger.info('Creating Indexes and Constraints...');
    await session.run('CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE');
    await session.run('CREATE CONSTRAINT product_id IF NOT EXISTS FOR (p:Product) REQUIRE p.productId IS UNIQUE');
    await session.run('CREATE CONSTRAINT cat_id IF NOT EXISTS FOR (c:Category) REQUIRE c.categoryId IS UNIQUE');

    // 1. Users
    const users = parseCSV('users.csv');
    await session.run(`
      UNWIND $users AS u
      MERGE (user:User {userId: u.userId})
      SET user.name = u.name, user.age = toInteger(u.age), user.location = u.location
    `, { users });
    logger.info(`✅ Seeded ${users.length} Users`);

    // 2. Products
    const products = parseCSV('products.csv');
    await session.run(`
      UNWIND $products AS p
      MERGE (prod:Product {productId: p.productId})
      SET prod.name = p.name, prod.price = toFloat(p.price), prod.category = p.category, prod.rating = toFloat(p.rating)
    `, { products });
    logger.info(`✅ Seeded ${products.length} Products`);

    // 3. Categories
    const categories = parseCSV('categories.csv');
    await session.run(`
      UNWIND $categories AS c
      MERGE (cat:Category {categoryId: c.categoryId})
      SET cat.name = c.name
    `, { categories });
    logger.info(`✅ Seeded ${categories.length} Categories`);

    // 4. Follows Edges
    const follows = parseCSV('follows.csv');
    await session.run(`
      UNWIND $follows AS f
      MATCH (u1:User {userId: f.fromUserId}), (u2:User {userId: f.toUserId})
      MERGE (u1)-[rel:FOLLOWS]->(u2)
      SET rel.since = f.since
    `, { follows });
    logger.info(`✅ Seeded ${follows.length} Follows relationships`);

    // 5. Bought Edges
    const bought = parseCSV('bought.csv');
    await session.run(`
      UNWIND $bought AS b
      MATCH (u:User {userId: b.userId}), (p:Product {productId: b.productId})
      MERGE (u)-[rel:BOUGHT]->(p)
      SET rel.purchase_date = b.purchase_date, rel.quantity = toInteger(b.quantity)
    `, { bought });
    logger.info(`✅ Seeded ${bought.length} Bought relationships`);

    // 6. Viewed Edges
    const viewed = parseCSV('viewed.csv');
    await session.run(`
      UNWIND $viewed AS v
      MATCH (u:User {userId: v.userId}), (p:Product {productId: v.productId})
      MERGE (u)-[rel:VIEWED]->(p)
      SET rel.view_count = toInteger(v.view_count), rel.last_viewed = v.last_viewed
    `, { viewed });
    logger.info(`✅ Seeded ${viewed.length} Viewed relationships`);

    // 7. Similar_To Edges
    const similar = parseCSV('similar.csv');
    await session.run(`
      UNWIND $similar AS s
      MATCH (p1:Product {productId: s.productId1}), (p2:Product {productId: s.productId2})
      MERGE (p1)-[rel:SIMILAR_TO]-(p2)
      SET rel.similarity_score = toFloat(s.similarity_score)
    `, { similar });
    logger.info(`✅ Seeded ${similar.length} Similar relationships`);

    // 8. Belongs_To Edges
    const belongs = parseCSV('belongs_to.csv');
    await session.run(`
      UNWIND $belongs AS b
      MATCH (p:Product {productId: b.productId}), (c:Category {categoryId: b.categoryId})
      MERGE (p)-[rel:BELONGS_TO]->(c)
    `, { belongs });
    logger.info(`✅ Seeded ${belongs.length} Belongs_To relationships`);

    await session.close();
    logger.info('🎉 Neo4j Seed complete.');
  } catch (error) {
    logger.error('❌ Seeding failed', error);
  } finally {
    await neo4jConnection.close();
  }
}

runSeed();
