import type { GalleryEventWithImages } from './gallery-data';
import { DriveFile } from './drive';

const GITHUB_API_BASE = 'https://api.github.com/repos';

interface GithubContent {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string | null;
    type: 'file' | 'dir';
    _links: {
        self: string;
        git: string;
        html: string;
    };
}

export interface GithubRepoConfig {
    owner: string;
    repo: string;
    path: string;
    branch?: string;
}

export const parseRepoUrl = (url: string): GithubRepoConfig | null => {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname !== 'github.com') return null;

        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length < 2) return null;

        const owner = parts[0];
        const repo = parts[1];

        // Check for tree/blob/main/etc
        // Format: /owner/repo/tree/branch/path...
        let branch = 'main'; // Default
        let path = '';

        if (parts.length > 3 && parts[2] === 'tree') {
            branch = parts[3];
            path = parts.slice(4).join('/');
        }

        return { owner, repo, branch, path };
    } catch (e) {
        return null;
    }
};

export const fetchGithubGallery = async (config: GithubRepoConfig): Promise<GalleryEventWithImages[]> => {
    const { owner, repo, path: configPath, branch = 'main' } = config;

    // Use Recursive Tree API to fetch everything in 1 call
    // GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
    const treeUrl = `${GITHUB_API_BASE}/${owner}/${repo}/git/trees/${branch}?recursive=1`;

    // Add auth header if token exists (Server-side only)
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
    };
    // Note: GITHUB_TOKEN caused issues with public repo access in this environment. 
    // Disabling it correctly fetches public data.
    // Note: GITHUB_TOKEN caused issues with public repo access in this environment. 
    // Disabling it correctly fetches public data.
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    try {
        const rootRes = await fetch(treeUrl, { headers, next: { revalidate: 30 } });

        if (rootRes.status === 403 || rootRes.status === 429) {
            console.error("GitHub API Rate Limit Exceeded");
            throw new Error("GitHub Rate Limit Exceeded. Please try again later or add GITHUB_TOKEN.");
        }

        if (!rootRes.ok) {
            console.error(`GitHub API Failed: ${rootRes.status} ${rootRes.statusText}`);
            throw new Error('Failed to fetch repo contents');
        }

        const data = await rootRes.json();
        const tree: any[] = data.tree;

        if (!tree || tree.length === 0) {
            console.error("GitHub Tree is empty", data);
            throw new Error(`GitHub Tree is empty. Recursive: 1. URL: ${treeUrl}.`);
        }

        // Group images by their parent folder
        const eventsMap = new Map<string, DriveFile[]>();

        tree.forEach((item: any) => {
            // We only care about matching image blobs
            if (item.type === 'blob' && item.path.match(/\.(jpg|jpeg|png|gif|webp|heic|avif|bmp|tiff|svg)$/i)) {
                // Check if file is within the configured path (if any)
                // configPath might be "events/2023" or empty
                if (configPath && !item.path.startsWith(configPath)) return;

                // Extract folder path relative to the config path
                // item.path = "path/to/folder/image.jpg"
                const fullPath = item.path;
                const pathParts = fullPath.split('/');
                const fileName = pathParts.pop(); // remove filename
                let folderPath = pathParts.join('/'); // "path/to/folder"

                // If the file is directly in the root (and configPath is empty), grouping strategy:
                // If we want to support root images, we might put them in a "General" event or ignore.
                // Assuming Gallery = Folders.
                if (!folderPath) {
                    folderPath = "General Gallery";
                }

                // Determine Event Name (Folder Name)
                // If configPath is set, we want the subfolder name *inside* that path
                // e.g. path="events", file="events/workshop/img.jpg", folder="events/workshop"
                // We want event name "workshop"

                // Normalizing folder key
                // For simplicity, we'll use the full folder path as the unique ID, but display the last segment
                const eventId = folderPath;

                // Raw GitHub URL construction
                // https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
                // Note: 'item.url' in Tree API is the BLOB API URL, not the raw content.
                // We must construct raw url manually.
                // Handling encoded paths might be needed, but usually simple approach works for standard chars.
                const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodeURI(fullPath)}`;

                const image: DriveFile = {
                    id: item.sha,
                    name: fileName || 'image',
                    mimeType: 'image/jpeg',
                    url: downloadUrl,
                    createdTime: new Date().toISOString() // No date in tree api
                };

                if (!eventsMap.has(eventId)) {
                    eventsMap.set(eventId, []);
                }
                eventsMap.get(eventId)?.push(image);
            }
        });

        // Convert Map to Array
        const events: GalleryEventWithImages[] = Array.from(eventsMap.entries()).map(([eventId, images]) => {
            // Event Name is the last part of the path
            const name = eventId.split('/').pop() || eventId;

            return {
                id: eventId, // Use path as ID for stability
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                createdTime: new Date().toISOString(),
                images: images
            };
        });

        return events;

    } catch (e) {
        console.log("GitHub Fetch ERROR CAUGHT:", e);
        return [];
    }
};
