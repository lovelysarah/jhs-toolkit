export type TransactionInfoTextProps = {
    item: any;
};

export const TransactionTableRow = ({ item }: TransactionInfoTextProps) => {
    return (
        <>
            <tr className="hidden md:table-row">
                <td>
                    <span className="font-bold">{item.user.name} </span>
                    {item.action_type === "CHECK_OUT"
                        ? "took"
                        : "brought back"}{" "}
                    <span className="font-bold link link-primary">
                        {item.item_ids.length} items
                    </span>
                    {" from"}{" "}
                    {item.shed_location === "FLANDERS"
                        ? "15 Flanders Court"
                        : "170 Joyce Ave"}
                    {" at"} {item.created_at.toLocaleTimeString()}
                    {" on"} {item.created_at.toLocaleDateString()}
                </td>
                <td>
                    <button className="btn btn-ghost">
                        {item.user.name.split(" ")[0]}'s bag
                    </button>
                </td>
            </tr>
            <tr className="hidden sm:table-row md:hidden">
                <td>
                    <span className="font-bold">{item.user.name} </span>
                    {item.action_type === "CHECK_OUT"
                        ? "took"
                        : "brought back"}{" "}
                    <span className="font-bold link link-primary">
                        {item.item_ids.length} items
                    </span>
                    {" from"}{" "}
                    {item.shed_location === "FLANDERS"
                        ? "15 Flanders Court"
                        : "170 Joyce Ave"}
                </td>
                <td>{item.created_at.toLocaleDateString()}</td>
            </tr>
            <tr className="sm:hidden">
                <td>{item.user.name}</td>
                <td>{item.item_ids.length} items</td>
            </tr>
        </>
    );
};
