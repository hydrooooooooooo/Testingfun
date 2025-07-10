export interface ScrapedItem {
    id: string;
    title: string;
    price: string;
    currency: string;
    description: string;
    listingUrl: string;
    imageUrl: string;
    allImageUrls: string[];
    location: string;
    latitude?: number;
    longitude?: number;
    category: string;
    creationTime: string;
    raw?: any;
}

export interface SessionData {
    sessionId: string;
    datasetId: string;
    timestamp: string;
    totalItems: number;
    processedPreview: any[];
    rawItemsSample: any[];
    payment_status?: string;
    stripe_session_id?: string;
    items?: ScrapedItem[]; // The full list of items
}
