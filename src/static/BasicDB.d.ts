export default class BasicDB {
    /**
     * Execute a function
     * @param function_name Name of the function eg: dobablabla(?,?,?)
     * @param binds array of values according to (?,?,?)
     * @param onSuccess function to call when the request succeds
     * @param onError function to call when the request fails
     */
    public static Function(function_name: string, binds: string[], onSuccess: Function, onError: Function): void;

    /**
     * Execute a procedure
     * @param procedure_name Name of the procedure eg: dobablabla(?,?,?)
     * @param binds array of values according to (?,?,?)
     * @param onSuccess function to call when the request succeds
     * @param onError function to call when the request fails
     */
    public static Procedure(procedure_name: string, binds: string[], onSuccess: Function, onError: Function): void;

    /**
     * Select data
     * @param table_name Table name or array or table names
     * @param columns array of columns names
     * @param where array eg ["col","value1","col2","?"] etc...
     * @param supp string to append at the end of the request
     * @param binds array of values according to the ? used in where
     * @param onSuccess function to call when the request succeds
     * @param onError function to call when the request fails
     */
    public static Select(table_name: string | string[], columns: string[],  where: string[] | null, supp: string | null, binds: string[], onSuccess: Function): void;

    /**
     * Close mysql pool
     */
    public static end(): void;

    /**
     * Calls JSON.parse
     */
    public static fromJSON(): any;
}
