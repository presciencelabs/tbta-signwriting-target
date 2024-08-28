// https://github.com/eclipsesource/pdf-maker/
import { makePdf, type Block, type ColumnsBlock, type DocumentDefinition, type TextBlock } from 'pdfmkr'

// usage: `cat example_input.txt | bun run src/index.ts`

const contents = await Bun.stdin.text()

const lines = extract_lines(contents)

const content = transform(lines)

const def: DocumentDefinition = {
	fonts: {
		default: [
			{
				data: await Bun.file('fonts/Times New Roman.ttf').arrayBuffer(),
			},
		],
	},
	content,
}

await Bun.write(Bun.stdout, await makePdf(def))

function transform(lines: string[]): Block[] {
	const blocks = []
	const MAX_SIGNS_PER_LINE = 5
	const SPACER = ''
	const PAGE_BREAK: TextBlock = {
		text: '',
		breakAfter: 'always',
	}

	for (const line of lines) {
		const words = line.split(' ')

		const buffer: string[] = []
		for (const word of words) {
			buffer.push(word)

			if (buffer.length === MAX_SIGNS_PER_LINE) {
				blocks.push(...flush(buffer))

				buffer.length = 0
			}
		}

		// this ensures lines are left-aligned since these are a mix of a sign and a word
		while (buffer.length && buffer.length < MAX_SIGNS_PER_LINE) {
			buffer.push(SPACER)
		}

		blocks.push(...flush(buffer), PAGE_BREAK)
	}

	return blocks
}

function extract_lines(input: string): string[] {
	return contents.split('\n').filter(valid)

	function valid(line: string = '') {
		return !['#', ''].includes(line.trim().charAt(0))
	}
}


function flush(words: string[] = []): ColumnsBlock[] {
	return [
		{
			columns: words.map(word => ({
				image: `images/${word || '_placeholder'}.png`,
			})),
		},
		{
			columns: words.map(word => ({
				text: word
			})),
			textAlign: 'center',
			padding: {
				bottom: 30,
			},
		},
	]
}
