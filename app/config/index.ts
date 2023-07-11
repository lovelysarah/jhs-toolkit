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
        SUMMARY_MORE_ACTIONS: boolean;
        OVERVIEW_SHOW_RECENT_ACTIVITY: boolean;
    };
};

export const CONTENT = {
    HEADER: {
        PREFIX: "JHS",
        NAME: "Storage",
    },
    FOOTER: {
        COMPANY_NAME: "John Howard Society of southeastern New Brunswick Inc.",
    },
} satisfies Config["CONTENT"];

export const FEATURE_FLAG = {
    SUMMARY_SEARCH: false,
    SUMMARY_MORE_ACTIONS: false,
    OVERVIEW_SHOW_RECENT_ACTIVITY: true,
} satisfies Config["FEATURE_FLAG"];

export default {
    CONTENT,
    FEATURE_FLAG,
} satisfies Config;
