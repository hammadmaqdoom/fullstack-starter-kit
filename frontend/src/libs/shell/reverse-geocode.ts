import { buildLocationLabel } from './shell-topbar.util';

const ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

type BigDataCloudResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
};

export async function reverseGeocodeLabel(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const url = new URL(ENDPOINT);
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('localityLanguage', 'en');
    const res = await fetch(url.toString());
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as BigDataCloudResponse;
    return buildLocationLabel({
      city: data.city,
      locality: data.locality,
      principalSubdivision: data.principalSubdivision,
    });
  } catch {
    return null;
  }
}
