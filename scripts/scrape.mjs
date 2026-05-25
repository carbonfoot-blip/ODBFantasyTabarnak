/**
 * ODB Fantasy 2026 — Player DB Scraper
 *
 * Uses Playwright (headless Chrome) to render JS pages and extract data directly.
 *
 * Setup (one time):
 *   npm install playwright
 *   npx playwright install chromium
 *
 * Usage:
 *   node scripts/scrape.mjs
 *
 * Resumable — skips already-scraped players on re-run.
 * Output: public/players-db.json
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname   = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH  = path.join(__dirname, '..', 'public', 'players-db.json')
const DELAY_MS     = 3000   // 3s between players
const MAX_RETRIES  = 2

// Check Playwright is installed
let chromium
try {
  const pw = await import('playwright')
  chromium = pw.chromium
} catch {
  console.error('❌  Playwright not installed.')
  console.error('    Run: npm install playwright && npx playwright install chromium')
  process.exit(1)
}

const PLAYERS = [
  ["Daniel Negreanu","daniel-negreanu",1,2103],
  ["Phil Hellmuth","phil-hellmuth",2,2080],
  ["Shaun Deeb","shaun-deeb",3,1884],
  ["John Racener","john-racener",4,1640],
  ["Ben Yu","ben-yu",5,1590],
  ["Paul Volpe","paul-volpe",6,1518],
  ["John Monnette","john-monnette",7,1511],
  ["David ODB Baker","david-odb-baker",8,1510],
  ["Jeremy Ausmus","jeremy-ausmus",9,1458],
  ["Scott Seiver","scott-seiver",10,1375],
  ["Brian Hastings","brian-hastings",11,1373],
  ["Calvin Anderson","calvin-anderson",12,1358],
  ["Marco Johnson","marco-johnson",13,1330],
  ["Nick Schulman","nick-schulman",14,1309],
  ["Benny Glaser","benny-glaser",15,1299],
  ["Justin Bonomo","justin-bonomo",16,1275],
  ["Robert Mizrachi","robert-mizrachi",17,1227],
  ["Brian Rast","brian-rast",18,1225],
  ["Jason Mercier","jason-mercier",19,1221],
  ["Anthony Zinno","anthony-zinno",20,1186],
  ["Stephen Chidwick","stephen-chidwick",21,1184],
  ["Chance Kornuth","chance-kornuth",22,1179],
  ["James Obst","james-obst",23,1153],
  ["Matt Glantz","matt-glantz",24,1107],
  ["Josh Arieh","josh-arieh",25,1103],
  ["Eli Elezra","eli-elezra",26,1048],
  ["Dan Smith","dan-smith",27,1022],
  ["Phil Ivey","phil-ivey",28,1017],
  ["Yuval Bronshtein","yuval-bronshtein",29,1014],
  ["David Bakes Baker","david-bakes-baker",30,1004],
  ["Dan Zack","dan-zack",31,998],
  ["Dario Sammartino","dario-sammartino",32,979],
  ["John Hennigan","john-hennigan",33,954],
  ["Scott Clements","scott-clements",34,901],
  ["Chris Klodnicki","chris-klodnicki",35,882],
  ["Mike Gorodinsky","mike-gorodinsky",36,875],
  ["Ismael Bojang","ismael-bojang",37,869],
  ["Joao Vieira","joao-vieira",38,851],
  ["Bryce Yockey","bryce-yockey",39,836],
  ["Adam Friedman","adam-friedman",40,830],
  ["Koray Aldemir","koray-aldemir",41,822],
  ["Michael Mizrachi","michael-mizrachi",42,766],
  ["Chris Brewer","chris-brewer",43,747],
  ["Yuri Dzivielevski","yuri-dzivielevski",44,731],
  ["Ari Engel","ari-engel",45,712],
  ["Scott Bohlman","scott-bohlman",46,710],
  ["Mike Matusow","mike-matusow",47,709],
  ["Chad Eveslage","chad-eveslage",48,704],
  ["Mike Leah","mike-leah",49,696],
  ["Ben Lamb","ben-lamb",50,685],
  ["Daniel Weinman","daniel-weinman",51,684],
  ["Jesse Martin","jesse-martin",52,678],
  ["Brandon Shack-Harris","brandon-shack-harris",53,673],
  ["Shannon Shorr","shannon-shorr",54,672],
  ["Alex Livingston","alex-livingston",55,661],
  ["Erik Seidel","erik-seidel",56,647],
  ["Ryan Riess","ryan-riess",57,643],
  ["Randy Ohel","randy-ohel",58,631],
  ["George Danzer","george-danzer",59,622],
  ["Christopher Vitch","christopher-vitch",60,617],
  ["Alex Foxen","alex-foxen",61,597],
  ["Jerry Wong","jerry-wong",61,597],
  ["Mike Watson","mike-watson",63,596],
  ["Jon Turner","jon-turner",64,595],
  ["Dan Kelly","dan-kelly",65,586],
  ["Eric Wasserson","eric-wasserson",66,573],
  ["Todd Brunson","todd-brunson",67,568],
  ["Brian Yoon","brian-yoon",67,568],
  ["Jason Koon","jason-koon",69,562],
  ["Jared Bleznick","jared-bleznick",70,546],
  ["Chris Hunichen","chris-hunichen",71,542],
  ["Jake Schwartz","jake-schwartz",72,539],
  ["Andrey Zaichenko","andrey-zaichenko",73,538],
  ["Brock Parker","brock-parker",74,537],
  ["Adam Hendrix","adam-hendrix",75,536],
  ["Phillip Hui","phillip-hui",76,520],
  ["Shawn Buchanan","shawn-buchanan",77,514],
  ["Maxx Coleman","maxx-coleman",77,514],
  ["Joey Couden","joey-couden",79,509],
  ["Yueqi Zhu","yueqi-zhu",80,503],
  ["Rep Porter","rep-porter",81,500],
  ["Noah Bronstein","noah-bronstein",82,498],
  ["Ray Henson","ray-henson",83,493],
  ["Craig Chait","craig-chait",84,489],
  ["Ryan Laplante","ryan-laplante",85,476],
  ["Andrew AJ Kelsall","andrew-aj-kelsall",85,476],
  ["Ryan Leng","ryan-leng",87,475],
  ["Chino Rheem","chino-rheem",88,474],
  ["Chris Ferguson","chris-ferguson",89,469],
  ["John Riordan","john-riordan",90,467],
  ["David Peters","david-peters",91,458],
  ["Ryan Hughes","ryan-hughes",92,456],
  ["Bryn Kenney","bryn-kenney",93,455],
  ["Dylan Linde","dylan-linde",94,446],
  ["Christian Harder","christian-harder",95,442],
  ["Kristen Foxen","kristen-foxen",96,431],
  ["David Chiu","david-chiu",97,429],
  ["Viacheslav Zhukov","viacheslav-zhukov",98,427],
  ["Joe McKeehen","joe-mckeehen",99,413],
  ["Daniel Strelitz","daniel-strelitz",100,411],
  ["Adrian Mateos","adrian-mateos",100,411],
  ["Sam Soverel","sam-soverel",102,410],
  ["Sean Winter","sean-winter",103,402],
  ["Max Pescatori","max-pescatori",104,399],
  ["Michael Noori","michael-noori",105,393],
  ["Jim Collopy","jim-collopy",106,389],
  ["Johanes Becker","johanes-becker",107,388],
  ["Jesse Lonis","jesse-lonis",108,371],
  ["Nick Guagenti","nick-guagenti",109,370],
  ["Frank Kassela","frank-kassela",110,363],
  ["Nick Petrangelo","nick-petrangelo",111,348],
  ["David Benyamine","david-benyamine",112,344],
  ["Daniel Shak","daniel-shak",112,344],
  ["Felipe Ramos","felipe-ramos",114,343],
  ["Greg Mueller","greg-mueller",115,337],
  ["Maria Ho","maria-ho",116,332],
  ["Bertrand Grospellier","bertrand-grospellier",117,326],
  ["Justin Saliba","justin-saliba",118,323],
  ["Jeff Lisandro","jeff-lisandro",119,317],
  ["Allen Kessler","allen-kessler",120,316],
  ["David Bach","david-bach",121,313],
  ["Mark Gregorich","mark-gregorich",122,310],
  ["Dzmitry Urbanovich","dzmitry-urbanovich",123,309],
  ["Stephen Song","stephen-song",124,305],
  ["Joe Cheong","joe-cheong",125,304],
  ["Brad Ruben","brad-ruben",126,302],
  ["Josh Reichard","josh-reichard",127,299],
  ["Barry Greenstein","barry-greenstein",128,297],
  ["Adam Owen","adam-owen",129,294],
  ["Kevin Gerhart","kevin-gerhart",130,293],
  ["Michael Holtz","michael-holtz",131,288],
  ["Scott Ball","scott-ball",132,286],
  ["Dylan Weisman","dylan-weisman",133,282],
  ["Isaac Haxton","isaac-haxton",134,274],
  ["Patrick Leonard","patrick-leonard",134,274],
  ["Phil Galfond","phil-galfond",136,269],
  ["Michael Moncek","michael-moncek",137,268],
  ["Georgios Sotiropoulos","georgios-sotiropoulos",138,266],
  ["Cary Katz","cary-katz",139,263],
  ["Julien Martini","julien-martini",140,261],
  ["Ren Lin","ren-lin",141,259],
  ["Vanessa Selbst","vanessa-selbst",142,258],
  ["David Williams","david-williams",143,257],
  ["David Prociak","david-prociak",144,256],
  ["Darren Elias","darren-elias",144,256],
  ["Joe Cada","joe-cada",144,256],
  ["Joao Simao Peres","joao-simao-peres",147,253],
  ["John Juanda","john-juanda",148,250],
  ["Asher Conniff","asher-conniff",149,249],
  ["Ben Diebold","ben-diebold",150,248],
  ["Chris George","chris-george",151,247],
  ["Matthew Gonzales","matthew-gonzales",152,246],
  ["Justin Liberto","justin-liberto",153,244],
  ["Daniel Buzgon","daniel-buzgon",154,243],
  ["Mike Wattel","mike-wattel",155,238],
  ["Steve Sung","steve-sung",156,236],
  ["Maurice Hawkins","maurice-hawkins",156,236],
  ["Ian OHara","ian-ohara",158,234],
  ["Ian Steinman","ian-steinman",159,230],
  ["Roland Israelashvili","roland-israelashvili",160,229],
  ["Arthur Morris","arthur-morris",161,225],
  ["Dong Chen","dong-chen",162,217],
  ["Nate Silver","nate-silver",163,216],
  ["Ankush Mandavia","ankush-mandavia",164,214],
  ["Erick Lindgren","erick-lindgren",165,211],
  ["Ali Eslami","ali-eslami",166,210],
  ["Martin Zamani","martin-zamani",167,209],
  ["Tom Marchese","tom-marchese",168,207],
  ["Eugene Katchalov","eugene-katchalov",169,204],
  ["Steve Billirakis","steve-billirakis",170,202],
  ["Mohsin Charania","mohsin-charania",170,202],
  ["Philip Sternheimer","philip-sternheimer",172,201],
  ["Nacho Barbero","nacho-barbero",173,200],
  ["Jeff Madsen","jeff-madsen",173,200],
  ["Seth Davies","seth-davies",175,199],
  ["Artur Martirosian","artur-martirosian",175,199],
  ["Danny Tang","danny-tang",177,196],
  ["Renan Bruschi","renan-bruschi",178,194],
  ["Aram Zobian","aram-zobian",178,194],
  ["Faraz Jaka","faraz-jaka",180,192],
  ["Kevin Eyster","kevin-eyster",181,191],
  ["Kane Kalas","kane-kalas",182,189],
  ["Jonathan Duhamel","jonathan-duhamel",183,187],
  ["Alex Luneau","alex-luneau",184,186],
  ["Steve Zolotow","steve-zolotow",185,179],
  ["Andrew Brown","andrew-brown",186,178],
  ["Toby Lewis","toby-lewis",187,172],
  ["Steven Wolansky","steven-wolansky",188,171],
  ["Matt Berkey","matt-berkey",189,170],
  ["David Funkhouser","david-funkhouser",190,169],
  ["Bart Hanson","bart-hanson",191,168],
  ["Dietrich Fast","dietrich-fast",191,168],
  ["Ash Gupta","ash-gupta",191,168],
  ["Daniel Idema","daniel-idema",194,167],
  ["Michael Gagliano","michael-gagliano",194,167],
  ["Thomas Taylor","thomas-taylor",196,166],
  ["Eddy Sabat","eddy-sabat",197,165],
  ["Hal Rotholz","hal-rotholz",197,165],
  ["Vladimir Schemelev","vladimir-schemelev",199,163],
  ["George Lind","george-lind",199,163],
  ["Valentin Vornicu","valentin-vornicu",201,162],
  ["Dylan Smith","dylan-smith",201,162],
  ["Brett Richey","brett-richey",203,159],
  ["Konstantin Puchkov","konstantin-puchkov",203,159],
  ["Justin Zaki","justin-zaki",203,159],
  ["Richard Ashby","richard-ashby",206,158],
  ["Biao Ding","biao-ding",207,157],
  ["Michael Trivett","michael-trivett",208,156],
  ["Matt Wantman","matt-wantman",208,156],
  ["Cord Garcia","cord-garcia",210,155],
  ["Martin Jacobson","martin-jacobson",211,154],
  ["Matt Vengrin","matt-vengrin",212,152],
  ["Joe Cassidy","joe-cassidy",213,150],
  ["Mikhail Semin","mikhail-semin",214,149],
  ["Ali Imsirovic","ali-imsirovic",215,148],
  ["Connor Drinan","connor-drinan",216,146],
  ["Nathan Gamble","nathan-gamble",216,146],
  ["Eric Froehlich","eric-froehlich",218,144],
  ["Jeff Gross","jeff-gross",219,143],
  ["Daniel Alaei","daniel-alaei",220,141],
  ["Maksim Pisarenko","maksim-pisarenko",220,141],
  ["Dario Alioto","dario-alioto",222,137],
  ["Yevgeniy Timoshenko","yevgeniy-timoshenko",223,135],
  ["Joe Kuether","joe-kuether",224,134],
  ["Punnat Punsri","punnat-punsri",224,134],
  ["Carol Fuchs","carol-fuchs",226,133],
  ["Nicholas Verderamo","nicholas-verderamo",226,133],
  ["Justin Young","justin-young",228,131],
  ["Scott Dulaney","scott-dulaney",229,126],
  ["Bart Lybaert","bart-lybaert",230,125],
  ["Aaron Kupin","aaron-kupin",231,124],
  ["Fedor Holz","fedor-holz",232,123],
  ["Matt Grapenthien","matt-grapenthien",233,122],
  ["Jason Somerville","jason-somerville",234,121],
  ["Owais Ahmed","owais-ahmed",235,119],
  ["Sergio Aido","sergio-aido",236,118],
  ["Christina Gollins","christina-gollins",237,117],
  ["Dan Colpoys","dan-colpoys",237,117],
  ["Markus Gonsalves","markus-gonsalves",239,116],
  ["Aditya Prasetyo","aditya-prasetyo",240,114],
  ["Tony Dunst","tony-dunst",241,113],
  ["Tyler Brown","tyler-brown",242,112],
  ["Nadya Magnus","nadya-magnus",243,111],
  ["Brock Wilson","brock-wilson",243,111],
  ["Alexey Makarov","alexey-makarov",245,110],
  ["Chris Moorman","chris-moorman",245,110],
  ["Michael Wang","michael-wang",245,110],
  ["Landon Tice","landon-tice",245,110],
  ["Sam Trickett","sam-trickett",249,109],
  ["Lee Goldman","lee-goldman",249,109],
  ["Vanessa Kade","vanessa-kade",249,109],
  ["Kenny Hallaert","kenny-hallaert",252,108],
  ["Kristen Deardorff","kristen-deardorff",252,108],
  ["Loni Harwood","loni-harwood",254,107],
  ["Elio Fox","elio-fox",255,106],
  ["Charlie Carrel","charlie-carrel",256,104],
  ["Stuart Rutter","stuart-rutter",256,104],
  ["Bin Weng","bin-weng",256,104],
  ["Dominick Sarle","dominick-sarle",256,104],
  ["Greg Merson","greg-merson",260,103],
  ["Doug Polk","doug-polk",261,102],
  ["Will Failla","will-failla",261,102],
  ["Sorel Mizzi","sorel-mizzi",263,99],
  ["Abe Mosseri","abe-mosseri",263,99],
  ["Antonio Esfandiari","antonio-esfandiari",265,97],
  ["David Coleman","david-coleman",265,97],
  ["Allen Cunningham","allen-cunningham",267,96],
  ["Tom Koral","tom-koral",267,96],
  ["Damjan Radanov","damjan-radanov",269,92],
  ["Joey Weissman","joey-weissman",270,91],
  ["Dustin Dirksen","dustin-dirksen",271,90],
  ["Tom Dwan","tom-dwan",272,88],
  ["Allen Bari","allen-bari",272,88],
  ["Victor Ramdin","victor-ramdin",274,86],
  ["Ted Forrest","ted-forrest",274,86],
  ["Harley Thrower","harley-thrower",274,86],
  ["Taylor Paur","taylor-paur",277,85],
  ["Dominik Nitsche","dominik-nitsche",278,83],
  ["Danny Wong","danny-wong",278,83],
  ["Christoph Vogelsang","christoph-vogelsang",278,83],
  ["Chris Bjorin","chris-bjorin",281,82],
  ["Minh Ly","minh-ly",281,82],
  ["Robert Campbell","robert-campbell",281,82],
  ["Ray Dehkharghani","ray-dehkharghani",284,81],
  ["Tristan Wade","tristan-wade",284,81],
  ["Chad Brown","chad-brown",286,80],
  ["Daniel Sepiol","daniel-sepiol",287,79],
  ["Andres Korn","andres-korn",287,79],
  ["Alexander Kostritsyn","alexander-kostritsyn",289,78],
  ["Daniel Lowery","daniel-lowery",289,78],
  ["Sean Perry","sean-perry",291,73],
  ["Matthew Hawrilenko","matthew-hawrilenko",292,70],
  ["Wing Po Liu","wing-po-liu",292,70],
  ["Andrew Moreno","andrew-moreno",294,69],
  ["Jameson Painter","jameson-painter",295,68],
  ["Anthony Hu","anthony-hu",295,68],
  ["Yingui Li","yingui-li",297,67],
  ["Michael Binger","michael-binger",298,64],
  ["Igor Kurganov","igor-kurganov",298,64],
  ["Lexy Gavin","lexy-gavin",298,64],
  ["Blake Bohn","blake-bohn",301,63],
  ["DJ Alexander","dj-alexander",301,63],
  ["Millard Hale","millard-hale",303,60],
  ["Ethan Yau","ethan-yau",303,60],
  ["Anson Tsang","anson-tsang",303,60],
  ["Eric Baldwin","eric-baldwin",306,59],
  ["Andrew Lichtenberger","andrew-lichtenberger",306,59],
  ["Andrey Zhigalov","andrey-zhigalov",306,59],
  ["James Chen","james-chen",309,58],
  ["Anthony Lellouche","anthony-lellouche",310,57],
  ["Tom Schneider","tom-schneider",310,57],
  ["Niall Farrell","niall-farrell",310,57],
  ["Jake Ferro","jake-ferro",313,56],
  ["Brad Owen","brad-owen",313,56],
  ["Ebony Kenney","ebony-kenney",313,56],
  ["Justin Smith","justin-smith",316,55],
  ["Brandon Cantu","brandon-cantu",316,55],
  ["Jon Shoreman","jon-shoreman",316,55],
  ["Aaron Massey","aaron-massey",319,54],
  ["Angela Jordison","angela-jordison",319,54],
  ["Gavin Smith","gavin-smith",321,53],
  ["Espen Jorstad","espen-jorstad",321,53],
  ["DJ MacKinnon","dj-mackinnon",323,52],
  ["Scott Eskenazi","scott-eskenazi",323,52],
  ["Joe Tehan","joe-tehan",325,50],
  ["Darren Rabinowitz","darren-rabinowitz",326,48],
  ["Andrew Yeh","andrew-yeh",326,48],
  ["Benjamin Zamani","benjamin-zamani",329,47],
  ["Jonathan Little","jonathan-little",330,46],
  ["David Pham","david-pham",331,45],
  ["John Holley","john-holley",331,45],
  ["Dekel Balas","dekel-balas",331,45],
  ["Chris Tryba","chris-tryba",335,41],
  ["Mike McDonald","mike-mcdonald",336,40],
  ["Qiang Xu","qiang-xu",337,39],
  ["Jordan Siegel","jordan-siegel",342,34],
  ["Huck Seed","huck-seed",349,32],
  ["Mikita Badziakouski","mikita-badziakouski",349,32],
  ["Chris Moneymaker","chris-moneymaker",422,7],
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function saveDb()  { fs.writeFileSync(OUTPUT_PATH, JSON.stringify(db, null, 2)) }
function parseNum(s) {
  if (s == null) return null
  const n = parseFloat(String(s).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

// ── Parse page HTML/text directly — no AI needed for static tables ────────────
function parsePage(html, name) {
  // All-time stats — find the table row
  const allTimeMatch = html.match(
    /(\d+)\s*<\/td>\s*<td[^>]*>\s*([\d,]+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*\((\d{4})\)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*\((\d{4})\)/
  )

  let allTimeRank=null,allTimeScore=null,timesDrafted=null,totalCashes=null
  let avgSalary=null,highestSalary=null,highestSalaryYear=null,lowestSalary=null,lowestSalaryYear=null

  if (allTimeMatch) {
    allTimeRank       = parseNum(allTimeMatch[1])
    allTimeScore      = parseNum(allTimeMatch[2])
    timesDrafted      = parseNum(allTimeMatch[3])
    totalCashes       = parseNum(allTimeMatch[4])
    avgSalary         = parseNum(allTimeMatch[5])
    highestSalary     = parseNum(allTimeMatch[6])
    highestSalaryYear = parseNum(allTimeMatch[7])
    lowestSalary      = parseNum(allTimeMatch[8])
    lowestSalaryYear  = parseNum(allTimeMatch[9])
  }

  // Years from dropdown <option> tags: e.g. "Daniel Negreanu 2025 Results"
  const yearMatches = [...html.matchAll(/(\d{4})\s+Results/g)]
  const years = [...new Set(yearMatches.map(m => parseInt(m[1])))].sort((a,b)=>a-b)

  // Year stats from table rows that appear after selecting a year
  // These are in a table: Rank | Team | Score | Salary | Cashes | Pts/$
  const historyRows = []
  const yearStatRe = /<tr[^>]*>[\s\S]*?<td[^>]*>\s*(\d+)\s*<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>\s*([\d.]+)\s*<\/td>[\s\S]*?<td[^>]*>\s*([\d.]+)\s*<\/td>[\s\S]*?<td[^>]*>\s*(\d+)\s*<\/td>[\s\S]*?<td[^>]*>\s*([\d.]+)\s*<\/td>[\s\S]*?<\/tr>/gi

  // Game type table
  const gameType = []
  const gtSection = html.match(/SCORING BY GAME TYPE[\s\S]*?(?=SCORING BY BUY|<\/section|<\/div>)/i)?.[0] || ''
  const gtRowRe = /<tr[^>]*>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>\s*<td[^>]*>\s*([\d,]+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>/gi
  let gtMatch
  while ((gtMatch = gtRowRe.exec(gtSection)) !== null) {
    const type = gtMatch[1].trim()
    if (type && !type.toLowerCase().includes('game type')) {
      gameType.push({ type, pts: parseNum(gtMatch[2]), cashes: parseNum(gtMatch[3]) })
    }
  }

  // Buy-in table
  const buyIn = []
  const biSection = html.match(/SCORING BY BUY IN[\s\S]*?(?=<\/section|<\/div>|$)/i)?.[0] || ''
  const biRowRe = /<tr[^>]*>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>\s*<td[^>]*>\s*([\d,]+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>/gi
  let biMatch
  while ((biMatch = biRowRe.exec(biSection)) !== null) {
    const level = biMatch[1].trim()
    if (level && !level.toLowerCase().includes('buy')) {
      buyIn.push({ level, pts: parseNum(biMatch[2]), cashes: parseNum(biMatch[3]) })
    }
  }

  return { allTimeRank, allTimeScore, timesDrafted, totalCashes, avgSalary,
           highestSalary, highestSalaryYear, lowestSalary, lowestSalaryYear,
           years, gameType, buyIn }
}

// ── Parse yearly stats table after clicking each year in dropdown ─────────────
function parseYearTable(html, year) {
  // The stats table has: Rank | Team | Score | Salary | Cashes | Pts/$
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/gi) || []
  for (const table of tableMatch) {
    // Look for a row with Score/Salary/Cashes pattern
    const rowMatch = table.match(/<tr[^>]*>[\s\S]*?<td[^>]*>\s*\d+\s*<\/td>[\s\S]*?<td[^>]*>[\s\S]*?Team[\s\S]*?<\/td>[\s\S]*?<td[^>]*>\s*([\d.]+)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>[\s\S]*?<\/tr>/i)
    if (rowMatch) {
      return { year, pts: parseNum(rowMatch[1]), cost: parseNum(rowMatch[2]), cashes: parseNum(rowMatch[3]) }
    }
    // Simpler: just grab numbers from a stats row
    const simpleRow = table.match(/>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*<\/td>/)
    if (simpleRow) {
      return { year, pts: parseNum(simpleRow[2]), cost: parseNum(simpleRow[3]), cashes: parseNum(simpleRow[4]) }
    }
  }
  return { year, pts: null, cost: null, cashes: null }
}

// ── Scrape one player with Playwright ────────────────────────────────────────
// profile.js reveals the mechanism:
//   1. User picks year from #player-history-by-year dropdown
//   2. User clicks #players-history-btn-by-year button
//   3. JS POSTs to /process/player-history with { year, player_id } + CSRF token
//   4. Server returns { status: "success", data: { results: "<html table>" } }
// We replicate this exactly using Playwright to get the CSRF token + player_id,
// then POST directly for each year.
async function scrapePlayer(browser, slug, name) {
  const profileUrl = `https://www.25kfantasy.com/players/player-profile/${slug}/`
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' }
  })
  const page = await context.newPage()

  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // Extract CSRF token, player_id, and year options from the page
    const pageData = await page.evaluate(() => {
      const csrfEl    = document.querySelector('#\\x43SRF_TOKEN, input[name="csrf_token"], meta[name="csrf-token"]')
      const playerIdEl = document.querySelector('#player-id')
      const selectEl  = document.querySelector('#player-history-by-year')

      // CSRF token may be a JS variable
      const csrfToken = (typeof CSRF_TOKEN !== 'undefined' ? CSRF_TOKEN : null) ||
                        csrfEl?.value || csrfEl?.getAttribute('content') || null

      const playerId = playerIdEl?.value || null

      const years = selectEl
        ? [...selectEl.querySelectorAll('option')]
            .map(o => ({ value: o.value, text: o.textContent.trim() }))
            .filter(o => o.value && o.value !== '0')
        : []

      return { csrfToken, playerId, years }
    })

    // Get CSRF token from JS scope via page.evaluate with window access
    let csrfToken = pageData.csrfToken
    if (!csrfToken) {
      csrfToken = await page.evaluate(() => {
        try { return window.CSRF_TOKEN || null } catch { return null }
      })
    }

    // Detect redirect — if the page title doesn't match a player profile,
    // the slug is wrong (e.g. site redirected to the players list page)
    const pageTitle = await page.title()
    const finalUrl  = page.url()
    if (!finalUrl.includes(`/player-profile/${slug}`)) {
      throw new Error(`Redirected away from profile — slug may be wrong. Landed at: ${finalUrl}`)
    }

    if (!csrfToken) throw new Error('Could not find CSRF token')
    if (!pageData.playerId) throw new Error(`Could not find player_id — page may have redirected. Title: "${pageTitle}"`)
    if (!pageData.years.length) throw new Error('No years found in dropdown')

    // Get static page data (all-time stats, game type, buy-in)
    const html = await page.content()
    const base = parsePage(html, name)

    // Get cookies for the POST request
    const cookies = await context.cookies()
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    // POST to /process/player-history for each year
    const history = []
    for (const { value: yearValue, text } of pageData.years) {
      const yearMatch = text.match(/(\d{4})/)
      if (!yearMatch) continue
      const year = parseInt(yearMatch[1])

      try {
        const resp = await page.evaluate(async ({ yearValue, playerId, csrfToken }) => {
          const r = await fetch('/process/player-history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify({ year: yearValue, player_id: playerId }),
          })
          const text = await r.text()
          return { status: r.status, body: text }
        }, { yearValue, playerId: pageData.playerId, csrfToken })

        if (resp.status !== 200) {
          history.push({ year, pts: null, cost: null, cashes: null })
          continue
        }

        // Parse the returned JSON { status: "success", data: { results: "<html>" } }
        const json = JSON.parse(resp.body)
        if (json.status !== 'success') {
          history.push({ year, pts: null, cost: null, cashes: null })
          continue
        }

        // Parse the HTML table in data.results
        // Columns: Rank | Team | Score | Salary | Cashes | Pts/$
        const tableHtml = json.data?.results || ''
        const rowMatch = tableHtml.match(
          /<tr[^>]*>[\s\S]*?<td[^>]*>\s*(\d+)\s*<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>\s*([\d.]+)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>/
        )
        if (rowMatch) {
          history.push({
            year,
            pts:    parseNum(rowMatch[2]),
            cost:   parseNum(rowMatch[3]),
            cashes: parseNum(rowMatch[4]),
          })
        } else {
          // Fallback: extract all numbers from the table
          const nums = [...tableHtml.matchAll(/<td[^>]*>\s*([\d.]+)\s*<\/td>/g)].map(m => parseNum(m[1]))
          // Expected order after rank+team: score, salary, cashes, pts/$
          if (nums.length >= 5) {
            history.push({ year, pts: nums[2], cost: nums[3], cashes: nums[4] })
          } else {
            history.push({ year, pts: null, cost: null, cashes: null })
          }
        }
      } catch (e) {
        history.push({ year, pts: null, cost: null, cashes: null })
      }

      await sleep(300) // small pause between year requests
    }

    history.sort((a, b) => a.year - b.year)
    return { ...base, history }
  } finally {
    await context.close()
  }
}



// ── Load existing DB ──────────────────────────────────────────────────────────
let db = {}
if (fs.existsSync(OUTPUT_PATH)) {
  try {
    db = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
    console.log(`📂 Resuming — ${Object.keys(db).length} players already done.`)
  } catch { db = {} }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const todo  = PLAYERS.filter(([, slug]) => !db[slug])
const total = PLAYERS.length
const done  = total - todo.length

console.log(`\n🃏  ODB Fantasy 2026 — Player Scraper (Playwright)`)
console.log(`   Total: ${total} | Done: ${done} | Remaining: ${todo.length}`)
console.log(`   Est:   ~${Math.ceil(todo.length * (DELAY_MS + 8000) / 60000)} min\n`)

if (!todo.length) { console.log('✅  All done!'); process.exit(0) }

const browser = await chromium.launch({ headless: true })
let ok = 0, fail = 0
const failures = []

for (let i = 0; i < todo.length; i++) {
  const [name, slug, rank, allTimeScore] = todo[i]
  const idx = done + i + 1
  process.stdout.write(`[${idx}/${total}] ${name.padEnd(32)} `)

  let result = null, lastErr = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) { process.stdout.write(`(retry ${attempt}) `); await sleep(3000) }
      result = await scrapePlayer(browser, slug, name)
      break
    } catch (e) { lastErr = e }
  }

  if (result) {
    db[slug] = { name, slug, rank, allTimeScore, ...result, scrapedAt: new Date().toISOString() }
    saveDb()
    ok++
    console.log(`✓  (${result.history?.length ?? 0} yrs, ${result.totalCashes ?? '?'} cashes)`)
  } else {
    fail++
    failures.push({ name, slug, error: lastErr?.message })
    console.log(`✗  ${lastErr?.message?.substring(0, 80)}`)
  }

  if (i < todo.length - 1) await sleep(DELAY_MS)
}

await browser.close()

console.log(`\n${'─'.repeat(52)}`)
console.log(`✅  Done — ${ok} scraped, ${fail} failed`)
if (failures.length) {
  console.log(`\n⚠️  Failures (re-run to retry):`)
  failures.forEach(f => console.log(`   ${f.name}: ${f.error?.substring(0, 80)}`))
}
console.log(`\n📄  DB → public/players-db.json`)
console.log(`   Next: npm run build && npm run deploy\n`)
