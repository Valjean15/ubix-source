//#region Builder

export class ExtractedTable {

    constructor (columns: string[], rows: string[][]){
        this.columns = columns;
        this.rows = rows;
    }

    columns: string[] = []
    rows: string[][] = []

    hasValues() : boolean {
        if (!this.rows || this.rows.length === 0)
            return false;

        if (this.rows.length === 1 && this.rows.at(0)?.at(0) === 'No records found.')
            return false;

        return true;
    }

    lookup(row: string[], column: string) : string | undefined {
        if (!this.columns || this.columns.length === 0)
            return undefined;

        const index = this.columns.findIndex(name => name === column);
        if (index === -1)
            return undefined;

        return row.at(index);
    } 
}

//#endregion

//#region Public

export class QueryResult {
    success: boolean;
    data: TrafficTicket[];
    time: Date = new Date()
    message: string | undefined

    constructor (sucess: boolean, data: TrafficTicket[], message: string = '') {
        this.success = sucess;
        this.data = data;
        this.message = message;
    }

    static success(data: TrafficTicket[]) {
        return new QueryResult(true, data || [], '') as SuccessQueryResult;
    }

    static failure(error: string) {
        return new QueryResult(false, [], error) as FailureQueryResult;
    }
}

export type SuccessQueryResult = Omit<QueryResult, 'message'> & { success: true };
export type FailureQueryResult = Omit<QueryResult, 'data'> & { success: false };

export type TrafficTicket = {
    media: 'physical' | 'virtual';
    document: string;
    sanctionType: string;
    status: string;
    number: string;
    amount: {
        value: number;
        interes: number;
        cost: number;
    };
    resolution: {
        date: string | undefined;
        number: string | undefined;
    };
}

//#endregion