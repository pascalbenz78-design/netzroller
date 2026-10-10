// Spielerinnen und Spieler der Karriere-Stufen (alle erfunden; Ähnlichkeiten mit echten Personen sind nicht beabsichtigt).
// [Name, Land, Stil, Rating]. Die Stufen bauen aufeinander auf: Aargau schwach, Welt stark.
// Turniere, Punkte und Aufstiegsregeln stehen in balance.js (career.tiers), die Turniernamen in texts.js.

const AG = [   // Aargau: 15 Gegner, Rating 850–1200
  ["Reto Hunziker", "CH", "allround", 1200], ["Michael Bürgi", "CH", "wall", 1175], ["Lukas Wey", "CH", "cannon", 1150],
  ["Simon Frey", "CH", "angle", 1125], ["Dario Meier", "CH", "counter", 1100], ["Fabian Suter", "CH", "allround", 1075],
  ["Patrick Lüscher", "CH", "wall", 1050], ["Nico Hofer", "CH", "cannon", 1025], ["Marco Widmer", "CH", "angle", 1000],
  ["Jan Baumann", "CH", "allround", 975], ["Kevin Schmid", "CH", "counter", 950], ["Andrin Gloor", "CH", "wall", 925],
  ["Yannick Hächler", "CH", "cannon", 900], ["Tim Zubler", "CH", "allround", 875], ["Elia Bachmann", "CH", "angle", 850],
];

const CH = [   // Schweiz: 31 Gegner, Rating 1100–1500
  ["Luca Bernasconi", "CH", "allround", 1500], ["Julien Favre", "CH", "cannon", 1487], ["Gian Caduff", "CH", "wall", 1474],
  ["Mathieu Rochat", "CH", "angle", 1461], ["Samuel Zürcher", "CH", "counter", 1448], ["Matteo Pedrazzini", "CH", "allround", 1435],
  ["Loïc Perrin", "CH", "cannon", 1422], ["Flurin Casutt", "CH", "wall", 1409], ["Cédric Monnier", "CH", "angle", 1396],
  ["Noah Rüegg", "CH", "allround", 1383], ["Severin Gisler", "CH", "counter", 1370], ["Thierry Jaquet", "CH", "cannon", 1357],
  ["Raffael Imboden", "CH", "wall", 1344], ["Dominik Arnold", "CH", "allround", 1331], ["Fabio Gianella", "CH", "angle", 1318],
  ["Nils Kälin", "CH", "counter", 1305], ["Yves Clerc", "CH", "allround", 1292], ["Florian Spörri", "CH", "cannon", 1279],
  ["Mauro Lepori", "CH", "angle", 1266], ["Kilian Zgraggen", "CH", "wall", 1253], ["Joël Bonvin", "CH", "allround", 1240],
  ["Basil Märki", "CH", "counter", 1227], ["Ivo Schelbert", "CH", "cannon", 1214], ["Leandro Rossi", "CH", "allround", 1201],
  ["Valentin Roulin", "CH", "angle", 1188], ["Sandro Cavegn", "CH", "wall", 1175], ["Tobias Wyss", "CH", "allround", 1162],
  ["Elias Hürlimann", "CH", "counter", 1149], ["Adrian Kuster", "CH", "cannon", 1136], ["Manuel Gerber", "CH", "allround", 1118],
  ["Lionel Pittet", "CH", "angle", 1100],
];

const EU = [   // Europa: 47 Gegner, Rating 1350–1750
  ["Jakob Lindner", "DE", "allround", 1750], ["Clément Girard", "FR", "cannon", 1741], ["Riccardo Conti", "IT", "wall", 1732],
  ["Álvaro Ruiz", "ES", "angle", 1723], ["Harry Collins", "GB", "counter", 1714], ["Oskar Nyberg", "SE", "allround", 1705],
  ["Valentin Huber", "AT", "cannon", 1696], ["Noah Bakker", "NL", "wall", 1687], ["Tomáš Král", "CZ", "angle", 1678],
  ["Luka Babić", "HR", "counter", 1669], ["Sindre Haugen", "NO", "allround", 1660], ["Antoine Leroy", "FR", "cannon", 1651],
  ["Moritz Kranz", "DE", "wall", 1642], ["Alessio Ferri", "IT", "angle", 1633], ["Javier Molina", "ES", "allround", 1624],
  ["Frederik Nielsen", "DK", "counter", 1615], ["Kacper Wójcik", "PL", "cannon", 1606], ["Arne Peeters", "BE", "wall", 1597],
  ["Eetu Mäkinen", "FI", "allround", 1588], ["Levente Kiss", "HU", "angle", 1579], ["Filip Jović", "RS", "counter", 1570],
  ["Conor Byrne", "IE", "allround", 1561], ["Sebastian Pichler", "AT", "cannon", 1552], ["James Ashby", "GB", "wall", 1543],
  ["Leon Albrecht", "DE", "angle", 1534], ["Bastien Faure", "FR", "allround", 1525], ["Simone Greco", "IT", "counter", 1516],
  ["Marc Puig", "ES", "cannon", 1507], ["Daan de Vries", "NL", "allround", 1498], ["Linus Ahlberg", "SE", "angle", 1489],
  ["Ondřej Svoboda", "CZ", "wall", 1480], ["Stefan Petkov", "BG", "counter", 1471], ["Dmytro Koval", "UA", "allround", 1462],
  ["Magnus Berg", "NO", "cannon", 1453], ["Rasmus Lund", "DK", "angle", 1444], ["Michał Nowak", "PL", "allround", 1435],
  ["Ádám Szabó", "HU", "wall", 1426], ["Louis Maes", "BE", "counter", 1417], ["Ben Schmit", "LU", "allround", 1408],
  ["Hugo Rinaldi", "MC", "angle", 1399], ["Paul Hartmann", "DE", "cannon", 1390], ["Elias Brunner", "AT", "allround", 1381],
  ["Nathan Dupont", "FR", "wall", 1372], ["Giulio Marchetti", "IT", "counter", 1363], ["Erik Sandberg", "SE", "allround", 1357],
  ["Jonas Weber", "DE", "angle", 1353], ["Lars Eriksen", "NO", "cannon", 1350],
];

// Welt: die 63 Spieler der Tour aus Phase 5, Rating auf 1600–2000 angehoben
const WORLD = [
  ["Viktor Lindqvist", "SE", "allround", 1950], ["Mateo Ibarra", "ES", "cannon", 1920], ["Felix Brandauer", "AT", "wall", 1900],
  ["Hugo Delacroix", "FR", "angle", 1880], ["Kenji Mori", "JP", "counter", 1860], ["Liam O'Rourke", "IE", "cannon", 1840],
  ["Davide Rinaldi", "IT", "allround", 1820], ["Jonas Achermann", "CH", "wall", 1800], ["Tomás Navarro", "AR", "angle", 1785],
  ["Erik Solberg", "NO", "counter", 1770], ["Pieter van Dijkhuis", "NL", "cannon", 1755], ["Marek Novotný", "CZ", "allround", 1740],
  ["Sam Whitfield", "GB", "angle", 1725], ["Lukas Reinholt", "DE", "wall", 1710], ["Bruno Carvalho", "BR", "cannon", 1695],
  ["Aleksi Virtanen", "FI", "counter", 1680], ["Ivan Petrović", "RS", "allround", 1665], ["Jae-won Park", "KR", "angle", 1650],
  ["Owen Mercer", "AU", "cannon", 1640], ["Mathis Lefort", "BE", "wall", 1630], ["Cole Harrington", "US", "cannon", 1620],
  ["Andrej Kovač", "HR", "angle", 1610], ["Nikola Dimitrov", "BG", "allround", 1600], ["Kasper Holm", "DK", "counter", 1590],
  ["Julien Moreau", "FR", "allround", 1580], ["Simon Gerber", "CH", "counter", 1570], ["Diego Restrepo", "CO", "angle", 1560],
  ["Tobias Krenn", "AT", "allround", 1550], ["Gabriel Lindgren", "SE", "wall", 1540], ["Nathan Bouchard", "CA", "cannon", 1530],
  ["Paweł Zieliński", "PL", "allround", 1520], ["Lorenzo Basile", "IT", "angle", 1510], ["Henrik Strand", "NO", "wall", 1500],
  ["Rafael Montes", "ES", "counter", 1490], ["Bence Horváth", "HU", "cannon", 1480], ["Timo Lobmeier", "DE", "allround", 1470],
  ["Arthur Penhallow", "GB", "wall", 1460], ["Yuto Hayashi", "JP", "angle", 1450], ["Mykola Bondar", "UA", "counter", 1440],
  ["Joel Wüthrich", "CH", "cannon", 1430], ["Ruben Vermeer", "NL", "allround", 1420], ["Théo Marchand", "MC", "angle", 1410],
  ["Ethan Calloway", "US", "counter", 1400], ["Lucas Pereira", "BR", "allround", 1390], ["Jakub Dvořák", "CZ", "wall", 1380],
  ["Emil Lundberg", "SE", "cannon", 1370], ["Niko Laine", "FI", "allround", 1360], ["Matteo Galli", "IT", "counter", 1350],
  ["Florian Haas", "DE", "angle", 1340], ["Ignacio Ferrer", "AR", "wall", 1330], ["Cian Gallagher", "IE", "allround", 1320],
  ["Damir Rakić", "HR", "cannon", 1310], ["Oliver Kent", "AU", "counter", 1300], ["Mads Kjær", "DK", "angle", 1290],
  ["Raphael Imhof", "CH", "allround", 1280], ["Tom Wagner", "LU", "wall", 1270], ["Ji-ho Shin", "KR", "cannon", 1260],
  ["Vincent Dubois", "BE", "counter", 1250], ["Patrick Lennox", "CA", "allround", 1240], ["Gustav Ek", "SE", "angle", 1230],
  ["Daniel Mráz", "CZ", "counter", 1220], ["Adrian Bühler", "CH", "cannon", 1210], ["Pablo Volea", "ES", "allround", 1200],
].map(([n, l, s, r]) => [n, l, s, Math.round(1600 + ((r - 1200) * 400) / 750)]);

const toObj = list => list.map(([name, land, style, rating]) => ({ name, land, style, rating }));
export const TIER_PLAYERS = { AG: toObj(AG), CH: toObj(CH), EU: toObj(EU), WORLD: toObj(WORLD) };
