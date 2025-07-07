
'use server';

// This server action fetches the URL content and strips HTML tags.
export async function getUrlTextContent(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        // Basic HTML tag stripping. More sophisticated parsing could be done.
        const textContent = html.replace(/<style[^>]*>.*<\/style>/gms, '')
                                .replace(/<script[^>]*>.*<\/script>/gms, '')
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim();
        return textContent;
    } catch (error) {
        console.error("Failed to fetch URL:", error);
        throw new Error("Could not fetch or process the URL. Please check the link and try again.");
    }
}
