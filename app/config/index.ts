type Config = {
    CONTENT: {
        HEADER: {
            PREFIX: string;
            NAME: string;
        };
        FOOTER: {
            COMPANY_NAME: string;
            MOTTO?: string;
        };
    };
    FEATURE_FLAG: {
        SUMMARY_SEARCH: boolean;
        OVERVIEW_SHOW_RECENT_ACTIVITY: boolean;
    };
};

export const CONTENT = {
    HEADER: {
        PREFIX: "JHS",
        NAME: "Inventories",
    },
    FOOTER: {
        COMPANY_NAME: "John Howard Society of southeastern New Brunswick Inc.",
    },
} satisfies Config["CONTENT"];

export const FEATURE_FLAG = {
    SUMMARY_SEARCH: false,
    OVERVIEW_SHOW_RECENT_ACTIVITY: false,
} satisfies Config["FEATURE_FLAG"];

export default {
    CONTENT,
    FEATURE_FLAG,
} satisfies Config;
