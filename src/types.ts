export type ActionCallbackType =
    | 'risibank-media-selected'
    | 'risibank-media-copy'
    | 'risibank-closed'
    | 'risibank-username-selected'
    | 'risibank-username-cleared';


export type RisiBankMedia = {
    id: number;
    cache_url: string;
    // Both null for a media uploaded straight to RisiBank, until a client fills its source in.
    source_url: string | null;
    source_type: string | null;
    source_exists: boolean;
    slug: string;
    user_id: number;
    score: number;
    interact_count: number;
    category: string;
    created_at: string;
    is_deleted: boolean;
}

export type ActionCallback = (data: {
    id: number;
    type: ActionCallbackType;
    media: RisiBankMedia;
}) => void;
