# Classes and methods whitelist
# Original version at opencv/platforms/js/opencv_js.config.py

core = { '': [] }

wechat_qrcode = {
        'wechat_qrcode_WeChatQRCode': [
                'WeChatQRCode',
                'detectAndDecode',
        ]
}

white_list = makeWhiteList([core, wechat_qrcode])
