import { Link, useSearchParams } from "@remix-run/react";

const Pagination = ({
    totalPages = Number.MAX_SAFE_INTEGER,
    pageParam = "page",
    // className = "",
    ...attrs
}) => {
    const [queryParams] = useSearchParams();
    const currentPage = Number(queryParams.get(pageParam) || 1);
    totalPages = Number(totalPages);

    const previousQuery = new URLSearchParams(queryParams);
    previousQuery.set(pageParam, (currentPage - 1).toString());
    const nextQuery = new URLSearchParams(queryParams);
    nextQuery.set(pageParam, (currentPage + 1).toString());

    return (
        <div className="flex w-full justify-center py-4">
            <nav
                className={"btn-group"}
                {...attrs}>
                {currentPage <= 1 && (
                    <button
                        disabled
                        className="btn btn-disabled">
                        Previous Page
                    </button>
                )}
                {currentPage > 1 && (
                    <Link
                        className="btn"
                        to={`?${previousQuery.toString()}`}>
                        Previous Page
                    </Link>
                )}
                <span className="btn btn-active">Page {currentPage}</span>
                {currentPage >= totalPages && (
                    <button className="btn btn-disabled">Next Page</button>
                )}
                {currentPage < totalPages && (
                    <Link
                        className="btn"
                        to={`?${nextQuery.toString()}`}>
                        Next Page
                    </Link>
                )}
            </nav>
        </div>
    );
};

export default Pagination;
