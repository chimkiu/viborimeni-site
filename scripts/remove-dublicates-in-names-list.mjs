import fs from 'fs/promises';
import matter from 'gray-matter';
import path from 'path';
import { glob } from 'glob';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify';

/* TODO: Добавить чтение имен из /content/names/*.md */

const PROJECT_ROOT_PATH = process.cwd();

const REMOVING_WORDS = [
  'в',
  'девочки',
  'для',
  'значает',
  'значение',
  'и',
  'имена',
  'имени',
  'имя',
  'исламе',
  'мальчика',
  'происхождение',
  'совместимость',
  'судьба',
  'что',
  'женщин',
  'мужчины',
  'женщины',
  'означает',
  'характер',
  'девочек',
  'мусульманское',
  'какой',
  'национальности',
  'ребенка',
  'женское',
];

async function main() {
  const csvFullFilePath = path.join(PROJECT_ROOT_PATH, 'generator', 'content', 'names.csv');

  const rows = await readCsvFile(csvFullFilePath);
  const updatedRows = await removeDublicatesInNamesList(rows);
  await saveCsvFile(updatedRows, csvFullFilePath);
}
main();

async function removeDublicatesInNamesList(rows) {
  const existingNames = await readExistingNames();
  const updatedRows = [];

  for (const row of rows) {
    let { keyword, status } = row;
    if (status === 'valid') {
      const words = keyword.split(' ');
      const name = words
        .filter((word) => !REMOVING_WORDS.includes(word))
        .join(' ')
        .trim();
      console.log(`Name: ${name}`);
      if (existingNames.has(name)) {
        if (status === 'valid') {
          status = 'dublicate';
          console.log(`Dublicate name: ${name}`);
        }
      }
      existingNames.add(name);
    }

    updatedRows.push({ keyword, status });
  }

  return updatedRows;
}

async function readExistingNames() {
  const names = new Set();
  const namesPath = path.join(PROJECT_ROOT_PATH, 'generator', 'content', 'names');
  const paths = await glob('**/*.md', {
    cwd: namesPath,
  });

  for (const filePath of paths) {
    const fullPath = path.join(namesPath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const { data } = matter(content);
    names.add(data.linkTitle.toLowerCase().trim());
  }
  return names;
}

async function readCsvFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    on_record: (record) => ({
      keyword: record.keyword && record.keyword.trim(),
      status: record.status || 'pending',
    }),
  });

  return records;
}

async function saveCsvFile(records, csvFullFilePath) {
  const csv = await stringify(records, {
    header: true,
    columns: [
      { key: 'keyword', header: 'keyword' },
      { key: 'status', header: 'status' },
    ],
    // bom: true, // раскомментируй, если планируешь открывать в Excel
  });

  await fs.writeFile(csvFullFilePath, csv);
}
