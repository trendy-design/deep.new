import Image from 'next/image';
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

const getHost = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return null;
  }
};

const getFavIcon = (host?: string) => {
  if (!host) {
    return null;
  }
  try {
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch (error) {
    return null;
  }
};

export const SourcesStack = ({ urls }: { urls: string[] }) => {
  if (urls.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-row items-center gap-2 rounded-full border bg-secondary p-1 text-xs">
      <div className="-gap-2 flex flex-row">
        {urls.slice(0, 3).map(url => {
          const host = getHost(url);
          const favIcon = getFavIcon(host ?? '');
          if (isValidUrl(url)) {
            return (
              <div className="relative -mr-2 h-6 w-6 overflow-hidden rounded-full border border-border bg-background">
                {' '}
                <Image
                  src={favIcon ?? ''}
                  alt={host ?? ''}
                  fill
                  className="not-prose absolute inset-0 h-full w-full object-cover"
                />
              </div>
            );
          }
          return null;
        })}
      </div>{' '}
      <div className="px-1 text-xs text-stone-500">{urls.length} sources</div>
    </div>
  );
};
