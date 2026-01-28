const axios = require('axios');

class MinecraftAPI {
    constructor() {
        this.timeout = 8000;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        this.retries = 3;
    }

    async _fetch(url, attempt = 1) {
        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': this.userAgent },
                timeout: this.timeout
            });
            return response.data;
        } catch (error) {
            if (attempt < this.retries) {
                await this._sleep(1000 * attempt);
                return this._fetch(url, attempt + 1);
            }
            console.error(`API request failed: ${url}`, error.message);
            return null;
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getVanillaVersions() {
        const data = await this._fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
        if (!data) return [];
        return data.versions
            .filter(v => v.type === 'release')
            .map(v => ({ id: v.id, url: v.url, type: 'vanilla' }));
    }

    async getPaperVersions(project = 'paper') {
        const data = await this._fetch(`https://api.papermc.io/v2/projects/${project}`);
        if (!data || !data.versions) return [];
        return data.versions.reverse();
    }

    async getPaperBuilds(project, version) {
        const data = await this._fetch(`https://api.papermc.io/v2/projects/${project}/versions/${version}`);
        if (!data || !data.builds) return [];
        return data.builds.reverse();
    }

    async getPurpurVersions() {
        const data = await this._fetch('https://api.purpurmc.org/v2/purpur');
        if (!data || !data.versions) return [];
        return data.versions.reverse();
    }

    async getFabricVersions() {
        const data = await this._fetch('https://meta.fabricmc.net/v2/versions/game');
        if (!data) return [];
        return data.filter(v => v.stable).map(v => v.version);
    }

    async getFabricLoaders() {
        const data = await this._fetch('https://meta.fabricmc.net/v2/versions/loader');
        if (!data) return [];
        return data.map(v => v.version);
    }

    async getForgeVersions() {
        const data = await this._fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
        if (!data || !data.promos) return {};
        return data.promos;
    }

    async getNeoForgeVersions() {
        return ['20.4.80-beta', '20.2.59'];
    }

    async getDownloadUrl(type, version) {
        const lowerType = type.toLowerCase();

        if (lowerType === 'paper') {
            const builds = await this.getPaperBuilds('paper', version);
            if (!builds || builds.length === 0) return null;
            const build = builds[0];
            return `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${build}/downloads/paper-${version}-${build}.jar`;
        }

        if (lowerType === 'purpur') {
            const builds = await this._fetch(`https://api.purpurmc.org/v2/purpur/${version}`);
            if (!builds || !builds.builds) return null;
            const latest = builds.builds.latest;
            return `https://api.purpurmc.org/v2/purpur/${version}/${latest}/download`;
        }

        if (lowerType === 'fabric') {
            const loaders = await this.getFabricLoaders();
            if (!loaders || loaders.length === 0) return null;
            return `https://meta.fabricmc.net/v2/versions/loader/${version}/${loaders[0]}/1.0.0/server/jar`;
        }

        if (lowerType === 'vanilla') {
            const versions = await this.getVanillaVersions();
            const versionData = versions.find(v => v.id === version);
            if (!versionData) return null;
            const manifest = await this._fetch(versionData.url);
            return manifest && manifest.downloads ? manifest.downloads.server.url : null;
        }

        return null;
    }
}

module.exports = MinecraftAPI;
