// https://github.com/eclipsesource/pdf-maker/
import { makePdf, type Block, type ColumnsBlock, type DocumentDefinition, type TextBlock } from 'pdfmkr'

// usage: `cat example_input.txt | bun run src/index.ts`

const contents = await Bun.stdin.text()

const lines = extract_lines(contents)

const content = await transform(lines)

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

function extract_lines(input: string): string[] {
	return contents.split('\n').map(remove_win_remnants).filter(valid)

	function valid(line: string = '') {
		return !['#', ''].includes(line.trim().charAt(0))
	}

	function remove_win_remnants(line: string) {
		return line.replace(/\r/g, '')
	}
}

type WordSign = {
	word: string
	image: string
}

async function transform(lines: string[]): Promise<Block[]> {
	const blocks = []
	const MAX_SIGNS_PER_LINE = 5
	const SPACER: WordSign = {
		word: '',
		image: 'images/_placeholder.png',
	}
	const PAGE_BREAK: TextBlock = {
		text: '',
		breakAfter: 'always',
	}

	for (const line of lines) {
		const words = line.split(' ')

		const buffer: WordSign[] = []
		for (const word of words) {
			buffer.push({
				word,
				image: await derive_image(word),
			})

			if (buffer.length === MAX_SIGNS_PER_LINE) {
				blocks.push(...await flush(buffer))

				buffer.length = 0
			}
		}

		// this ensures lines are left-aligned since these are a combo of a sign and a word
		while (buffer.length && buffer.length < MAX_SIGNS_PER_LINE) {
			buffer.push(SPACER)
		}

		blocks.push(... await flush(buffer), PAGE_BREAK)
	}

	return blocks

	async function derive_image(word: string): Promise<string> {
		const ENDS_IN_PLURAL_OR_PUNCT = /[s.]$/
		if(ENDS_IN_PLURAL_OR_PUNCT.test(word)) {
			return await derive_image(word.slice(0, -1))
		}

		const sign = `images/${word}.png`

		if (await Bun.file(sign).exists()) {
			return sign
		}

		const sign_lowercase = sign.toLowerCase()
		if (await Bun.file(sign_lowercase).exists()) {
			return sign_lowercase
		}

		return 'images/_missing.png'
	}
}

async function flush(word_signs: WordSign[] = []): Promise<ColumnsBlock[]> {
	return [
		{
			columns: word_signs.map(({image}) => ({image})),
		},
		{
			columns: word_signs.map(({word}) => ({text: word})),
			textAlign: 'center',
			padding: {
				bottom: 50,
			},
		},
	]
}
