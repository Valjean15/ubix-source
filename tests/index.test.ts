import { get } from '../src/index'

describe('Scrapping', () => {

    test('sample', async () => {

        await get('lmk081');

        expect(true).toBe(true);
    })
    
})