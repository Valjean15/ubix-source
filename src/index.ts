import puppeteer, { Browser, Page } from "puppeteer";
import { ExtractedTable, FailureQueryResult, QueryResult, SuccessQueryResult, TrafficTicket } from "./index.model";

//#region Builder

type BuilderQueryOptions = {
    url: string
}

/**
 * Builder that is used to nvaigate and extract the information
 */
class Builder {

    //#region Constants

    private static readonly NETWORK_IDLE = 'networkidle2';
    private static readonly TEXT_INPUT = 'input[id="form\\:hora"]';
    private static readonly SEARCH_BUTTON = 'a[id="form\\:btnIngresar"]';
    private static readonly PHYSICAL_TRAFFIC_TICKETS_TABLE = '#form\\:tbl';
    private static readonly VIRTUAL_TRAFFIC_TICKETS_TABLE = '#form\\:tblelectronicos';

    //#endregion

    //#region Private fields

    /**
     * Options used on the page scrap
     */
    private options: BuilderQueryOptions;

    /**
     * Browser used to navigate
     */
    private browser: Browser | undefined;

    /**
     * Page which contain the information
     */
    private page: Page | undefined;

    //#endregion

    constructor (options: BuilderQueryOptions){
        this.options = options;
    }

    //#region Private Methods

    /**
     * @description Launch browser with a new page used to scrap the information
     */
    private async launch() {
        this.browser = await puppeteer.launch({ headless: true });
        this.page = await this.browser.newPage();
        await this.page.goto(this.options.url, {
            waitUntil: Builder.NETWORK_IDLE,
        });
    }

    /**
     * @description Lookup license plate on the page
     * @param licensePlate License plate to search information
     */
    private async search(licensePlate: string){
        await this.page?.type(Builder.TEXT_INPUT, licensePlate);
        await Promise.all([
            this.page?.click(Builder.SEARCH_BUTTON),
            this.page?.waitForNavigation({ waitUntil: Builder.NETWORK_IDLE }),
        ]);
    }

    /**
     * @description Extract table raw information 
     * @param query CSS query
     * @returns Table information
     */
    private async extractTable(query: string): Promise<ExtractedTable> {        
        const extracted = await this.page?.evaluate((table) => {

            const columns = [...document.querySelectorAll(`${table} thead tr th`)]
                .map(cell => cell as HTMLTableCellElement)
                .map(({ innerText }) => innerText.trim());

            const rows = [...document.querySelectorAll(`${table} tbody tr`)]
                .map(row => 
                    [...row.querySelectorAll('td')]
                        .map(cell => cell as HTMLTableCellElement)
                        .map(({ innerText }) => innerText.trim())
                );

            return { columns, rows } as ExtractedTable;

        }, query);

        return new ExtractedTable(extracted?.columns ?? [], extracted?.rows ?? []);
    }

    /**
     * @description Transform the raw information of HTML table
     * @param type Type of the ticket
     * @param table Table to extract data
     * @returns Processed table information
     */
    private transform(type: 'physical' | 'virtual', table: ExtractedTable): TrafficTicket[] {
        if (!table || !table.hasValues())
            return [];
    
        const lookupAsNumber = (row: string[], column: string) => {
            const 
                raw = table.lookup(row, column),
    
                // Only for es-CO
                replaced1 = raw?.replaceAll('.', ''),
                replaced2 = replaced1?.replaceAll(',', ',')
                ;
    
            return Number(replaced2);
        }
    
        return table.rows.map(row => {
            return {
                media: type,
                document: table.lookup(row, 'Id Documento'),
                sanctionType: table.lookup(row, 'Tipo Sanción'),
                status: table.lookup(row, 'Estado Comparendo'),
                number: table.lookup(row, 'Nro Comparendo'),
                amount: {
                    cost: lookupAsNumber(row, 'Costas'),
                    interes: lookupAsNumber(row, 'Interés'),
                    value: lookupAsNumber(row, 'Valor Multa')
                },
                resolution: {
                    number: table.lookup(row, 'Número Resolución'),
                    date: table.lookup(row, 'Fecha Resolución'),
                }
            } as TrafficTicket
        });
    }

    //#endregion

    //#region Public Methods

    public async get(licensePlate: string) : Promise<SuccessQueryResult | FailureQueryResult> {
        try {

            await this.launch();
            await this.search(licensePlate);

            return QueryResult.success([
                ...this.transform("physical", await this.extractTable(Builder.PHYSICAL_TRAFFIC_TICKETS_TABLE)),
                ...this.transform("virtual", await this.extractTable(Builder.VIRTUAL_TRAFFIC_TICKETS_TABLE))
            ]);

        } catch (error: any) {
            return QueryResult.failure(error?.name ?? '')
        }
        finally{
            if (this.browser)
                this.browser.close();
        }
    }

    //#endregion
}

//#endregion

export const get = async (licensePlate: string) : Promise<SuccessQueryResult | FailureQueryResult> => {
    const result = await new Builder({
        url: 'https://portal.barranquilla.gov.co:8181/ConsultaEstadoCuenta/consultaPlaca'
    })
    .get(licensePlate);

    return result;
}