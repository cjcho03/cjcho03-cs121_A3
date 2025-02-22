import { readdir } from "node:fs/promises";
import path from "node:path";

type FileName = string;

export interface WebsiteFile {
	url: string,
	content: string,
	encoding: string
}

const WEBSITES_PATH = "/developer/DEV/";

export default async function getWebsites() {
	const subfolderNames = await openDirectory(WEBSITES_PATH);
	const filePaths = (await Promise.all(subfolderNames.flatMap(async subfolderName => {
		const fullSubfolderPath = WEBSITES_PATH + subfolderName;
		const fileNames = await openDirectory(fullSubfolderPath)
		return fileNames.map(fileName => "." + fullSubfolderPath + "/" + fileName)
	}))).flat();
	const files = await Promise.all(filePaths.map(filePath => Bun.file(filePath)));
	return files;
}

async function openDirectory(relativePath: string, workingDirectory = process.cwd().replaceAll(path.sep, path.posix.sep)): Promise<FileName[]> {
	return await readdir(workingDirectory + relativePath);
}
