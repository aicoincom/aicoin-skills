"""AiCoin Data SDK for Freqtrade Strategies
=========================================
Import this in your Freqtrade strategy to access AiCoin's aggregated market data
from 200+ exchanges:

    from aicoin_data import AiCoinData

    ac = AiCoinData()          # Auto-loads API keys from .env
    whales = ac.big_orders("btcswapusdt:binance")
    ls = ac.ls_ratio()
    funding = ac.funding_rate("btcswapusdt:binance")

Built-in caching prevents excessive API calls during live trading.
In backtest mode, strategies should fall back to standard indicators
(AiCoin real-time data is not available for historical periods).

API tier requirements (some data needs paid subscription):
  Free:    coin_ticker, kline, hot_coins, pair_ticker
  Basic:   + ls_ratio, funding_rate, newsflash
  Normal:  + big_orders, agg_trades, hl whale/liq/OI/taker
  Premium: + depth, liquidation_map, indicator_kline
  Pro:     + open_interest, super_depth, ai_analysis
See https://www.aicoin.com/opendata for plans.
"""
import hmac
import hashlib
import base64
import json
import os
import time
import random
import logging
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

# AiCoin exchange name mapping (Freqtrade/CCXT name -> AiCoin name)
EXCHANGE_MAP = {
    'binance': 'binance',
    'okx': 'okex',
    'bybit': 'bybit',
    'bitget': 'bitget',
    'gate': 'gate',
    'htx': 'huobipro',
    'huobi': 'huobipro',
    'kucoin': 'kucoin',
}


def ccxt_to_aicoin(pair: str, exchange: str = 'binance') -> str:
    """Convert CCXT pair format to AiCoin symbol format.

    'BTC/USDT:USDT' -> 'btcswapusdt:binance'  (futures/swap)
    'BTC/USDT'      -> 'btcusdt:binance'       (spot)
    'ETH/USDT:USDT' -> 'ethswapusdt:binance'   (futures/swap)
    """
    base = pair.split('/')[0].lower()
    is_swap = ':' in pair
    ex = EXCHANGE_MAP.get(exchange.lower(), exchange.lower())
    if is_swap:
        return f"{base}swapusdt:{ex}"
    return f"{base}usdt:{ex}"


class AiCoinData:
    """AiCoin API client for use inside Freqtrade strategies.

    Features:
    - HMAC-SHA1 signed requests (same algorithm as the Node.js SDK)
    - Auto-loads API keys from .env files
    - Built-in TTL cache (default 5 min) to avoid hammering the API
    - Proxy support via HTTP_PROXY / HTTPS_PROXY env vars
    """

    _cache: dict = {}  # Shared across instances

    def __init__(self, cache_ttl: int = 300):
        """
        Args:
            cache_ttl: Cache time-to-live in seconds (default 300 = 5 min).
                       Set to 0 to disable caching.
        """
        self.cache_ttl = cache_ttl
        self._load_env()
        self._setup_proxy()
        defaults = self._load_defaults()
        self.base = os.environ.get('AICOIN_BASE_URL', 'https://open.aicoin.com')
        self.key = os.environ.get('AICOIN_ACCESS_KEY_ID', defaults.get('accessKeyId', ''))
        self.secret = os.environ.get('AICOIN_ACCESS_SECRET', defaults.get('accessSecret', ''))

    # ── Setup helpers ──

    @staticmethod
    def _load_env():
        candidates = [
            Path.cwd() / '.env',
            Path.home() / '.openclaw' / 'workspace' / '.env',
            Path.home() / '.openclaw' / '.env',
        ]
        for f in candidates:
            if not f.exists():
                continue
            try:
                for line in f.read_text().splitlines():
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    eq = line.find('=')
                    if eq < 1:
                        continue
                    k = line[:eq].strip()
                    v = line[eq + 1:].strip()
                    if len(v) >= 2 and v[0] in ('"', "'") and v[-1] == v[0]:
                        v = v[1:-1]
                    if k not in os.environ:
                        os.environ[k] = v
            except Exception:
                pass

    @staticmethod
    def _setup_proxy():
        """Ensure standard proxy env vars are set for urllib."""
        proxy_url = (
            os.environ.get('PROXY_URL')
            or os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
            or os.environ.get('HTTP_PROXY') or os.environ.get('http_proxy')
            or os.environ.get('ALL_PROXY') or os.environ.get('all_proxy')
        )
        if proxy_url:
            if proxy_url.startswith('socks'):
                logger.warning(
                    'SOCKS proxy detected but urllib does not support SOCKS natively. '
                    'AiCoin data requests may fail. Consider setting an HTTP proxy instead.'
                )
            else:
                os.environ.setdefault('HTTPS_PROXY', proxy_url)
                os.environ.setdefault('HTTP_PROXY', proxy_url)

    @staticmethod
    def _load_defaults() -> dict:
        p = Path(__file__).parent / 'defaults.json'
        if p.exists():
            try:
                return json.loads(p.read_text())
            except Exception:
                pass
        return {}

    # ── Auth ──

    def _sign(self) -> dict:
        nonce = '%08x' % random.getrandbits(32)
        ts = str(int(time.time()))
        s = f'AccessKeyId={self.key}&SignatureNonce={nonce}&Timestamp={ts}'
        h = hmac.new(self.secret.encode(), s.encode(), hashlib.sha1).hexdigest()
        sig = base64.b64encode(h.encode()).decode()
        return {
            'AccessKeyId': self.key,
            'SignatureNonce': nonce,
            'Timestamp': ts,
            'Signature': sig,
        }

    # ── HTTP ──

    def _get(self, path: str, params: dict = None, cache_key: str = None) -> dict:
        if cache_key and self.cache_ttl > 0 and cache_key in self._cache:
            ts, data = self._cache[cache_key]
            if time.time() - ts < self.cache_ttl:
                return data

        p = {**(params or {}), **self._sign()}
        url = f'{self.base}{path}?{urlencode(p)}'
        req = Request(url, headers={'User-Agent': 'AiCoin-Freqtrade/1.0'})
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())

        if cache_key and self.cache_ttl > 0:
            self._cache[cache_key] = (time.time(), data)
        return data

    def _post(self, path: str, body: dict = None) -> dict:
        p = {**(body or {}), **self._sign()}
        payload = json.dumps(p).encode()
        req = Request(
            f'{self.base}{path}',
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'AiCoin-Freqtrade/1.0',
            },
        )
        with urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())

    # ── Market Data (raw API responses) ──

    def coin_ticker(self, coin_list: str) -> dict:
        """Real-time coin prices. coin_list: 'bitcoin' or 'bitcoin,ethereum,solana'"""
        return self._get('/api/v2/coin/ticker', {'coin_list': coin_list},
                         cache_key=f'ticker:{coin_list}')

    def kline(self, symbol: str, period: str = '3600', size: str = '100') -> dict:
        """K-line data. period in seconds: 900=15m, 3600=1h, 14400=4h, 86400=1d"""
        return self._get('/api/v2/commonKline/dataRecords',
                         {'symbol': symbol, 'period': period, 'size': size},
                         cache_key=f'kline:{symbol}:{period}:{size}')

    def hot_coins(self, key: str = 'market') -> dict:
        """Trending coins. key: defi/gamefi/market/web/newcoin/stable"""
        return self._get('/api/v2/market/hotTabCoins', {'key': key},
                         cache_key=f'hot:{key}')

    # ── Derivatives Data ──

    def ls_ratio(self) -> dict:
        """Cross-exchange aggregated long/short ratio. [Basic+ tier]"""
        return self._get('/api/v2/mix/ls-ratio', cache_key='ls_ratio')

    def funding_rate(self, symbol: str, interval: str = '8h',
                     weighted: bool = False, limit: str = '20') -> dict:
        """Funding rate history. weighted=True for volume-weighted cross-exchange rate. [Basic+ tier]"""
        path = ('/api/upgrade/v2/futures/funding-rate/vol-weight-history' if weighted
                else '/api/upgrade/v2/futures/funding-rate/history')
        return self._get(path, {'symbol': symbol, 'interval': interval, 'limit': limit},
                         cache_key=f'funding:{symbol}:{interval}:{weighted}')

    def open_interest(self, symbol: str, interval: str = '15m',
                      limit: str = '20') -> dict:
        """Aggregated open interest across exchanges. [Pro tier]"""
        return self._get(
            '/api/upgrade/v2/futures/open-interest/aggregated-stablecoin-history',
            {'symbol': symbol, 'interval': interval, 'limit': limit},
            cache_key=f'oi:{symbol}:{interval}')

    def liquidation_map(self, dbkey: str, cycle: str = '24h') -> dict:
        """Liquidation heatmap — exclusive AiCoin data. [Premium+ tier]"""
        return self._get('/api/upgrade/v2/futures/liquidation/map',
                         {'dbkey': dbkey, 'cycle': cycle},
                         cache_key=f'liq_map:{dbkey}:{cycle}')

    def liquidation_history(self, symbol: str, interval: str = '5m',
                            limit: str = '20') -> dict:
        """Liquidation history. [Premium+ tier]"""
        return self._get('/api/upgrade/v2/futures/liquidation/history',
                         {'symbol': symbol, 'interval': interval, 'limit': limit},
                         cache_key=f'liq_hist:{symbol}:{interval}')

    # ── Order Flow (Whale Tracking) ──

    def big_orders(self, symbol: str) -> dict:
        """Whale/large order tracking — exclusive AiCoin data. [Normal+ tier]"""
        return self._get('/api/v2/order/bigOrder', {'symbol': symbol},
                         cache_key=f'big_orders:{symbol}')

    def agg_trades(self, symbol: str) -> dict:
        """Aggregated large trades across exchanges. [Normal+ tier]"""
        return self._get('/api/v2/order/aggTrade', {'symbol': symbol},
                         cache_key=f'agg_trades:{symbol}')

    # ── Market Overview ──

    def nav(self, lan: str = 'cn') -> dict:
        """Market navigation/overview."""
        return self._get('/api/v2/mix/nav', {'lan': lan}, cache_key='nav')

    def grayscale_trust(self) -> dict:
        """Grayscale trust data. [Normal+ tier]"""
        return self._get('/api/v2/mix/grayscale-trust', cache_key='grayscale')

    # ── Hyperliquid On-chain Data ──

    def hl_whale_positions(self, coin: str = None, min_usd: str = None) -> dict:
        """Hyperliquid whale open positions. [Normal+ tier]"""
        p = {}
        if coin:
            p['coin'] = coin
        if min_usd:
            p['min_usd'] = min_usd
        return self._get('/api/upgrade/v2/hl/whales/open-positions', p,
                         cache_key=f'hl_whale:{coin}')

    def hl_whale_directions(self, coin: str = None) -> dict:
        """Hyperliquid whale long/short directional bias. [Normal+ tier]"""
        p = {}
        if coin:
            p['coin'] = coin
        return self._get('/api/upgrade/v2/hl/whales/directions', p,
                         cache_key=f'hl_dir:{coin}')

    def hl_taker_delta(self, coin: str, interval: str = None) -> dict:
        """Hyperliquid accumulated taker buy/sell delta. [Normal+ tier]"""
        p = {}
        if interval:
            p['interval'] = interval
        return self._get(f'/api/upgrade/v2/hl/accumulated-taker-delta/{coin}', p,
                         cache_key=f'hl_taker:{coin}')

    def hl_oi_history(self, coin: str, interval: str = '4h') -> dict:
        """Hyperliquid open interest history. [Normal+ tier]"""
        return self._get(f'/api/upgrade/v2/hl/open-interest/history/{coin}',
                         {'interval': interval},
                         cache_key=f'hl_oi:{coin}:{interval}')

    # ── AI Analysis ──

    def ai_analysis(self, coin_keys: list, language: str = 'CN') -> dict:
        """AiCoin AI-powered coin analysis & prediction. [Pro tier]"""
        body = {'coinKeys': coin_keys}
        if language:
            body['language'] = language
        return self._post('/api/v2/content/ai-coins', body)

    # ── Cache Management ──

    def clear_cache(self):
        """Clear all cached data. Call this to force fresh API requests."""
        self._cache.clear()

    def set_cache_ttl(self, seconds: int):
        """Change cache TTL. Set 0 to disable caching."""
        self.cache_ttl = seconds
