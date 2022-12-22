export class Texture {
    texture: GPUTexture | undefined = undefined
    sampler: GPUSampler | undefined = undefined
    bitmap: ImageBitmap | undefined = undefined
    filepath: string | undefined = undefined

    constructor(filepath: string) {
        this.filepath = filepath;
    }

    setFilepath(filepath: string) {
        this.filepath = filepath;
    }

    createView() {
        return this.texture!.createView();
    }

    async create(device: GPUDevice) {
        const img = document.createElement('img');
        // img.src = new URL(
        //     this.filepath!, 
        //     import.meta.url
        //     ).toString();
        // await img.decode();
        
        // Wait for image to load
        const resp = await fetch(this.filepath);
        if (!resp.ok) {
            return console.error("Network error", resp.status);
        }
        const blob = await resp.blob();
        this.bitmap = await createImageBitmap(blob);
        console.log(this.bitmap);

        this.texture = device.createTexture({
            size: [this.bitmap.width, this.bitmap.height],
            format: 'rgba8unorm',
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        device.queue.copyExternalImageToTexture
        (
            {source: this.bitmap},
            {texture: this.texture},
            [this.bitmap.width, this.bitmap.height]
        )
    }
}