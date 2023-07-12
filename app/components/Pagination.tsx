import { Link, useSearchParams } from "@remix-run/react";

const Pagination = ({
    totalPages = Number.MAX_SAFE_INTEGER,
    pageParam = "page",
    // className = "",
    ...attrs
}) => {
    const [queryParams] = useSearchParams();
    const currentPage = Math.min(
        Number(queryParams.get(pageParam) || 1),
        totalPages
    );
    totalPages = Number(totalPages);

    const prevPage = Math.max(currentPage - 1, 0);
    const nextPage = Math.min(currentPage + 1, totalPages);

    console.log({ currentPage, nextPage, prevPage, totalPages });
    const previousQuery = new URLSearchParams(queryParams);
    previousQuery.set(pageParam, prevPage.toString());
    const nextQuery = new URLSearchParams(queryParams);
    nextQuery.set(pageParam, nextPage.toString());

    return (
        <div className="flex w-full justify-center py-4">
            <nav
                className={"btn-group"}
                {...attrs}>
                {currentPage <= 1 && (
                    <button
                        disabled
                        className="btn btn-disabled">
                        Previous
                    </button>
                )}
                {currentPage > 1 && (
                    <Link
                        preventScrollReset
                        className="btn"
                        to={`?${previousQuery.toString()}`}>
                        Previous
                    </Link>
                )}
                <span className="btn btn-active">Page {currentPage}</span>
                {currentPage >= totalPages && (
                    <button className="btn btn-disabled">Next</button>
                )}
                {currentPage < totalPages && (
                    <Link
                        preventScrollReset
                        className="btn"
                        to={`?${nextQuery.toString()}`}>
                        Next
                    </Link>
                )}
            </nav>
        </div>
    );
};

export default Pagination;
