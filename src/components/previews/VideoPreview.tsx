import { FC, useState, useEffect } from 'react';
import { useRouter, useTranslation } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';
import { useAsync } from 'react-async-hook';
import { useClipboard } from 'use-clipboard-copy';
import { getBaseUrl, getExtension, getStoredToken } from '../../utils';

import { DownloadButton } from '../DownloadBtnGtoup';
import { DownloadBtnContainer, PreviewContainer } from './Containers';
import FourOhFour from '../FourOhFour';
import Loading from '../Loading';
import CustomEmbedLinkMenu from '../CustomEmbedLinkMenu';

const VideoPlayer: FC<{
  videoName: string,
  videoUrl: string,
  width?: number,
  height?: number,
  thumbnail: string,
  subtitle: string,
  isFlv: boolean,
  mpegts: any
}> = ({ videoName, videoUrl, width, height, thumbnail, subtitle, isFlv, mpegts }) => {
  useEffect(() => {
    axios.get(subtitle, { responseType: 'blob' })
      .then(response => {
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = 'English';
        track.srclang = 'en';
        track.src = URL.createObjectURL(response.data);
        document.querySelector('video').appendChild(track);
      })
      .catch(() => console.error('Could not load the subtitle file.'));

    if (isFlv) {
      const loadFlv = async () => {
        const { default: flvJs } = await import('flv.js');
        const videoElement = document.getElementById('plyr') as HTMLVideoElement;
        if (flvJs.isSupported()) {
          const flvPlayer = flvJs.createPlayer({
            type: 'flv',
            url: videoUrl
          });
          flvPlayer.attachMediaElement(videoElement);
          flvPlayer.load();
        }
      };
      loadFlv();
    }
  }, [subtitle, videoUrl, isFlv, mpegts]);

  return (
    <Plyr
      id="plyr"
      source={{
        type: 'video',
        title: videoName,
        poster: thumbnail,
        sources: [{ src: videoUrl, type: getExtension(videoUrl) }],
        tracks: [{
          kind: 'subtitles',
          label: 'English',
          src: subtitle,
          default: true
        }]
      }}
      options={{
        ratio: `${width ?? 16}:${height ?? 9}`,
        captions: { active: true, update: true },
        fullscreen: { iosNative: true }
      }}
    />
  );
};

const VideoPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter();
  const { t } = useTranslation();
  const clipboard = useClipboard();
  const hashedToken = getStoredToken(asPath);
  const videoUrl = `/api/raw/?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`;
  const isFlv = getExtension(file.name) === 'flv';

  const {
    loading,
    error,
    result: mpegts
  } = useAsync(async () => {
    if (isFlv) {
      return (await import('mpegts.js')).default;
    }
  }, [isFlv]);

  return (
    <>
      <CustomEmbedLinkMenu path={asPath} />
      <PreviewContainer>
        {error ? (
          <FourOhFour errorMsg={error.message} />
        ) : loading && isFlv ? (
          <Loading loadingText={t('Loading FLV extension...')} />
        ) : (
          <VideoPlayer
            videoName={file.name}
            videoUrl={videoUrl}
            width={file.video?.width}
            height={file.video?.height}
            thumbnail={thumbnail}
            subtitle={subtitle}
            isFlv={isFlv}
            mpegts={mpegts}
          />
        )}
      </PreviewContainer>
      <DownloadBtnContainer>
        <div className="flex flex-wrap justify-center gap-2">
          <DownloadButton
            onClickCallback={() => window.open(videoUrl)}
            btnColor="blue"
            btnText={t('Download')}
            btnIcon="file-download"
          />
          <DownloadButton
            onClickCallback={() => {
              clipboard.copy(`${getBaseUrl()}/api/raw/?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`)
              toast.success(t('Copied direct link to clipboard.'))
            }}
            btnColor="pink"
            btnText={t('Copy direct link')}
            btnIcon="copy"
          />
          <DownloadButton
            onClickCallback={() => setMenuOpen(true)}
            btnColor="teal"
            btnText={t('Customise link')}
            btnIcon="pen"
          />
          <DownloadButton
            onClickCallback={() => window.open(`iina://weblink?url=${getBaseUrl()}${videoUrl}`)}
            btnText="IINA"
            btnImage="/players/iina.png"
          />
          <DownloadButton
            onClickCallback={() => window.open(`vlc://${getBaseUrl()}${videoUrl}`)}
            btnText="VLC"
            btnImage="/players/vlc.png"
          />
          <DownloadButton
            onClickCallback={() => window.open(`potplayer://${getBaseUrl()}${videoUrl}`)}
            btnText="PotPlayer"
            btnImage="/players/potplayer.png"
          />
          <DownloadButton
            onClickCallback={() => window.open(`nplayer-http://${window.location.hostname}${videoUrl}`)}
            btnText="nPlayer"
            btnImage="/players/nplayer.png"
          />
        </div>
      </DownloadBtnContainer>
    </>
  );
};

export default VideoPreview;
